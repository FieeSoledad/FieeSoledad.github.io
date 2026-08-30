import rss from '@astrojs/rss'; import { getCollection } from 'astro:content';
export async function GET(context){ const posts = await getCollection('posts', ({data})=>!data.draft); return rss({title:'Fiee Soledad', description:'个人博客', site:context.site, items:posts.map(p=>({title:p.data.title, description:p.data.description, pubDate:p.data.published, link:`/blog/${p.id}/`}))}); }
