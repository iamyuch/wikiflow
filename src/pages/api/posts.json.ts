import type { APIRoute } from 'astro';
import { getAllPosts } from '../../utils/posts';

export const GET: APIRoute = async () => {
  const allPosts = await getAllPosts();
  
  // 只返回搜索需要的必要字段，减少数据量
  const searchData = allPosts.map(post => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date
  }));

  return new Response(JSON.stringify(searchData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
