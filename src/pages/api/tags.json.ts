import type { APIRoute } from 'astro';
import { getAllTags } from '../../utils/posts';

export const GET: APIRoute = async () => {
  const tags = await getAllTags();
  
  return new Response(JSON.stringify(tags), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
