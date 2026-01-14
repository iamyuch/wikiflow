import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';

export interface Post {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  category: string;
  date: string;
  content: string;
}

export async function getAllPosts(): Promise<Post[]> {
  const contentDir = join(process.cwd(), 'content');
  const files = await readdir(contentDir);
  const mdFiles = files.filter(file => file.endsWith('.md'));

  const posts = await Promise.all(
    mdFiles.map(async (file) => {
      const filePath = join(contentDir, file);
      const fileContent = await readFile(filePath, 'utf-8');
      const { data, content } = matter(fileContent);

      return {
        slug: data.slug || file.replace('.md', ''),
        title: data.title || 'Untitled',
        description: data.description || '',
        keywords: data.keywords || '',
        category: data.category || '',
        date: data.date || '',
        content,
      };
    })
  );

  // 按日期排序，最新的在前
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const posts = await getAllPosts();
  return posts.find(post => post.slug === slug);
}



export function paginatePosts(posts: Post[], page: number = 1, pageSize: number = 30) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedPosts = posts.slice(start, end);
  const totalPages = Math.ceil(posts.length / pageSize);

  return {
    posts: paginatedPosts,
    currentPage: page,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
