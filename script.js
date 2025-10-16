const STORAGE_KEY = 'simple-board-posts';

const form = document.getElementById('post-form');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const noticeCheckbox = document.getElementById('isNotice');
const formMessage = document.getElementById('form-message');
const submitButton = document.getElementById('submit-button');
const cancelEditButton = document.getElementById('cancel-edit');

const searchInput = document.getElementById('search');
const sortSelect = document.getElementById('sort-order');

const noticeList = document.getElementById('notice-list');
const noticeEmpty = document.getElementById('notice-empty');
const noticeCount = document.getElementById('notice-count');

const postList = document.getElementById('post-list');
const postEmpty = document.getElementById('post-empty');
const postCount = document.getElementById('post-count');

const postTemplate = document.getElementById('post-template');

const NOTICE_EMPTY_TEXT = '등록된 공지사항이 없습니다.';
const NOTICE_EMPTY_SEARCH_TEXT = '검색 조건과 일치하는 공지사항이 없습니다.';
const POST_EMPTY_TEXT = '아직 작성된 글이 없습니다.';
const POST_EMPTY_SEARCH_TEXT = '검색 조건과 일치하는 게시글이 없습니다.';

let editingId = null;
let searchTerm = '';
let sortOrder = 'desc';
let suppressResetMessage = false;

function loadPosts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.error('게시글을 불러오는 중 오류가 발생했습니다.', error);
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function createId() {
  return `post-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatDate(timestamp) {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  return formatter.format(timestamp);
}

function clearList(list) {
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
}

function renderPosts() {
  const posts = loadPosts();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPosts = posts.filter((post) => {
    if (!normalizedSearch) return true;
    const text = `${post.title} ${post.content}`.toLowerCase();
    return text.includes(normalizedSearch);
  });

  const notices = filteredPosts.filter((post) => post.isNotice);
  const regularPosts = filteredPosts.filter((post) => !post.isNotice);

  const sortByDate = (a, b) =>
    sortOrder === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;

  const sortedNotices = [...notices].sort(sortByDate);
  const sortedRegularPosts = [...regularPosts].sort(sortByDate);

  clearList(noticeList);
  clearList(postList);

  sortedNotices.forEach((post) => {
    const element = createPostElement(post);
    noticeList.appendChild(element);
  });

  sortedRegularPosts.forEach((post) => {
    const element = createPostElement(post);
    postList.appendChild(element);
  });

  const isSearching = Boolean(normalizedSearch);

  noticeCount.textContent = sortedNotices.length;
  postCount.textContent = sortedRegularPosts.length;

  noticeEmpty.textContent = isSearching ? NOTICE_EMPTY_SEARCH_TEXT : NOTICE_EMPTY_TEXT;
  postEmpty.textContent = isSearching ? POST_EMPTY_SEARCH_TEXT : POST_EMPTY_TEXT;

  noticeEmpty.hidden = sortedNotices.length > 0;
  postEmpty.hidden = sortedRegularPosts.length > 0;
}

function createPostElement(post) {
  const node = postTemplate.content.firstElementChild.cloneNode(true);
  const article = node.querySelector('article');
  article.setAttribute('aria-label', post.isNotice ? '공지사항' : '일반 글');

  node.dataset.id = post.id;

  const title = node.querySelector('.post-title');
  title.textContent = post.title;

  const date = node.querySelector('.post-date');
  date.dateTime = new Date(post.createdAt).toISOString();
  date.textContent = formatDate(post.createdAt);
  date.title = post.updatedAt
    ? `작성: ${formatDate(post.createdAt)} / 수정: ${formatDate(post.updatedAt)}`
    : `작성: ${formatDate(post.createdAt)}`;

  const content = node.querySelector('.post-content');
  content.textContent = post.content;

  const type = node.querySelector('.post-type');
  type.textContent = post.isNotice ? '공지' : '일반';

  const updated = node.querySelector('.post-updated');
  updated.textContent = post.updatedAt ? `수정됨 · ${formatDate(post.updatedAt)}` : '';

  const editButton = node.querySelector('.post-edit');
  editButton.addEventListener('click', () => startEdit(post.id));

  const deleteButton = node.querySelector('.post-delete');
  deleteButton.addEventListener('click', () => handleDelete(post.id));

  return node;
}

function showMessage(text, type = 'info') {
  formMessage.textContent = text;
  formMessage.dataset.type = type;
}

function resetForm() {
  suppressResetMessage = true;
  form.reset();
  titleInput.focus();
}

function handleSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const isNotice = noticeCheckbox.checked;

  if (!title || !content) {
    showMessage('제목과 내용을 모두 입력해주세요.', 'error');
    return;
  }

  const posts = loadPosts();
  if (editingId) {
    const exists = posts.some((post) => post.id === editingId);
    if (!exists) {
      exitEditMode({ resetFields: false });
      showMessage('수정하려는 게시글을 찾을 수 없습니다.', 'error');
      return;
    }

    const updatedPosts = posts.map((post) =>
      post.id === editingId
        ? {
            ...post,
            title,
            content,
            isNotice,
            updatedAt: Date.now()
          }
        : post
    );

    savePosts(updatedPosts);
    showMessage('게시글이 수정되었습니다.', 'success');
    exitEditMode();
  } else {
    const newPost = {
      id: createId(),
      title,
      content,
      isNotice,
      createdAt: Date.now(),
      updatedAt: null
    };

    posts.push(newPost);
    savePosts(posts);

    showMessage('게시글이 등록되었습니다.', 'success');
    resetForm();
  }
  renderPosts();
}

function handleDelete(id) {
  const confirmDelete = window.confirm('해당 게시글을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.');
  if (!confirmDelete) {
    return;
  }
  const posts = loadPosts();
  const nextPosts = posts.filter((post) => post.id !== id);
  savePosts(nextPosts);
  if (editingId === id) {
    exitEditMode();
  }
  renderPosts();
  showMessage('게시글이 삭제되었습니다.', 'success');
}

function startEdit(id) {
  const posts = loadPosts();
  const target = posts.find((post) => post.id === id);
  if (!target) {
    showMessage('수정할 게시글을 찾을 수 없습니다.', 'error');
    return;
  }

  editingId = id;
  form.dataset.mode = 'edit';
  titleInput.value = target.title;
  contentInput.value = target.content;
  noticeCheckbox.checked = Boolean(target.isNotice);
  submitButton.textContent = '수정 저장';
  cancelEditButton.hidden = false;
  cancelEditButton.disabled = false;
  showMessage('게시글 수정 모드입니다. 내용을 변경한 뒤 저장을 눌러주세요.', 'info');
  titleInput.focus();
}

function exitEditMode({ resetFields = true } = {}) {
  editingId = null;
  delete form.dataset.mode;
  submitButton.textContent = '등록';
  cancelEditButton.hidden = true;
  if (resetFields) {
    resetForm();
  }
}

function handleCancelEdit() {
  if (!editingId) return;
  exitEditMode();
  showMessage('게시글 수정을 취소했습니다.', 'info');
}

form.addEventListener('submit', handleSubmit);
form.addEventListener('reset', () => {
  exitEditMode({ resetFields: false });
  if (!suppressResetMessage) {
    showMessage('입력이 초기화되었습니다.');
  }
  suppressResetMessage = false;
});

cancelEditButton.addEventListener('click', handleCancelEdit);

searchInput.addEventListener('input', (event) => {
  searchTerm = event.target.value;
  renderPosts();
});

sortSelect.addEventListener('change', (event) => {
  sortOrder = event.target.value === 'asc' ? 'asc' : 'desc';
  renderPosts();
});

document.addEventListener('DOMContentLoaded', () => {
  renderPosts();
});