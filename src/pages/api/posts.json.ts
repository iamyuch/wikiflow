import type { APIRoute } from 'astro';
import { getAllPosts } from '../../utils/posts';

export const GET: APIRoute = async () => {
  const posts = await getAllPosts();
  
  // 只返回必要的字段，减少数据量
  const simplifiedPosts = posts.map(post => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    tags: post.tags,
    date: post.date,
  }));
  
  return new Response(JSON.stringify(simplifiedPosts), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
