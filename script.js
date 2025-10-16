const STORAGE_KEY = 'simple-board-posts';

const form = document.getElementById('post-form');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const noticeCheckbox = document.getElementById('isNotice');
const formMessage = document.getElementById('form-message');

const noticeList = document.getElementById('notice-list');
const noticeEmpty = document.getElementById('notice-empty');
const noticeCount = document.getElementById('notice-count');

const postList = document.getElementById('post-list');
const postEmpty = document.getElementById('post-empty');
const postCount = document.getElementById('post-count');

const postTemplate = document.getElementById('post-template');

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

  const notices = posts.filter((post) => post.isNotice);
  const regularPosts = posts.filter((post) => !post.isNotice);

  const sortedNotices = [...notices].sort((a, b) => b.createdAt - a.createdAt);
  const sortedRegularPosts = [...regularPosts].sort((a, b) => b.createdAt - a.createdAt);

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

  noticeCount.textContent = sortedNotices.length;
  postCount.textContent = sortedRegularPosts.length;

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

  const content = node.querySelector('.post-content');
  content.textContent = post.content;

  const type = node.querySelector('.post-type');
  type.textContent = post.isNotice ? '공지' : '일반';

  const deleteButton = node.querySelector('.post-delete');
  deleteButton.addEventListener('click', () => handleDelete(post.id));

  return node;
}

function showMessage(text, type = 'info') {
  formMessage.textContent = text;
  formMessage.dataset.type = type;
}

function resetForm() {
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

  const newPost = {
    id: createId(),
    title,
    content,
    isNotice,
    createdAt: Date.now()
  };

  const posts = loadPosts();
  posts.push(newPost);
  savePosts(posts);

  showMessage('게시글이 등록되었습니다.', 'success');
  resetForm();
  renderPosts();
}

function handleDelete(id) {
  const posts = loadPosts();
  const nextPosts = posts.filter((post) => post.id !== id);
  savePosts(nextPosts);
  renderPosts();
  showMessage('게시글이 삭제되었습니다.', 'success');
}

form.addEventListener('submit', handleSubmit);
form.addEventListener('reset', () => {
  showMessage('입력이 초기화되었습니다.');
});

document.addEventListener('DOMContentLoaded', () => {
  renderPosts();
});