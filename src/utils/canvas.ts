import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';

export type CanvasSide = 'left' | 'right' | 'top' | 'bottom';

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide: CanvasSide;
  toNode: string;
  toSide: CanvasSide;
}

export interface CanvasBaseNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

export interface CanvasTextNode extends CanvasBaseNode {
  type: 'text';
  text: string;
}

export interface CanvasFileNode extends CanvasBaseNode {
  type: 'file';
  file: string;
  subpath?: string;
}

export interface CanvasLinkNode extends CanvasBaseNode {
  type: 'link';
  url: string;
  text?: string;
}

export interface CanvasGroupNode extends CanvasBaseNode {
  type: 'group';
  label?: string;
  color?: string;
}

export type CanvasNode = CanvasTextNode | CanvasFileNode | CanvasLinkNode | CanvasGroupNode | CanvasBaseNode;

export interface CanvasDocument {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface CanvasMetadata {
  title?: string;
  slug?: string;
}

export interface CanvasBoard {
  slug: string;
  title: string;
  sourceFile: string;
  document: CanvasDocument;
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeCanvasDocument(record: Record<string, unknown>, sourceFile: string): CanvasDocument {
  return {
    nodes: ensureArray<CanvasNode>(record.nodes),
    edges: ensureArray<CanvasEdge>(record.edges),
  };
}

function isCanvasMetaMarker(data: Record<string, unknown>): boolean {
  const marker = data.canvas;
  if (marker === 'meta' || marker === true) return true;
  if (data.type === 'canvas-meta') return true;
  if (data.canvasMeta === true) return true;
  return false;
}

function parseCanvasFrontmatter(text: string): CanvasMetadata | undefined {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('---')) return undefined;

  try {
    const parsed = matter(text);
    const data = parsed.data as unknown;
    if (typeof data !== 'object' || data === null) return undefined;
    const dataRecord = data as Record<string, unknown>;
    if (!isCanvasMetaMarker(dataRecord)) return undefined;

    const title = normalizeString(dataRecord.title);
    const slug = normalizeString(dataRecord.slug);
    if (!title && !slug) return undefined;

    return { title, slug };
  } catch {
    return undefined;
  }
}

function extractMetadataFromNodes(nodes: CanvasNode[]): { meta: CanvasMetadata; metaNodeIds: Set<string> } {
  for (const node of nodes) {
    if (node.type !== 'text') continue;
    if (typeof (node as any).text !== 'string') continue;

    const parsed = parseCanvasFrontmatter((node as any).text as string);
    if (!parsed) continue;

    return {
      meta: parsed,
      metaNodeIds: new Set([node.id]),
    };
  }

  return {
    meta: {},
    metaNodeIds: new Set(),
  };
}

function extractMetadataFromRecord(record: Record<string, unknown>): CanvasMetadata {
  const rootTitle = normalizeString(record.title);
  const rootSlug = normalizeString(record.slug);

  const metaContainer = record.metadata ?? record.meta;
  if (typeof metaContainer === 'object' && metaContainer !== null) {
    const metaRecord = metaContainer as Record<string, unknown>;
    return {
      title: normalizeString(metaRecord.title) ?? rootTitle,
      slug: normalizeString(metaRecord.slug) ?? rootSlug,
    };
  }

  const frontmatter = normalizeString(record.frontmatter);
  if (frontmatter) {
    const parsed = parseCanvasFrontmatter(frontmatter);
    if (parsed) return { ...parsed, title: parsed.title ?? rootTitle, slug: parsed.slug ?? rootSlug };
  }

  return { title: rootTitle, slug: rootSlug };
}

function mergeMetadata(primary: CanvasMetadata, secondary: CanvasMetadata): CanvasMetadata {
  return {
    title: primary.title ?? secondary.title,
    slug: primary.slug ?? secondary.slug,
  };
}

export async function getAllCanvases(): Promise<CanvasBoard[]> {
  const contentDir = join(process.cwd(), 'content');
  const files = await readdir(contentDir);
  const canvasFiles = files.filter((file) => file.endsWith('.canvas'));

  const canvases = await Promise.all(
    canvasFiles.map(async (file) => {
      const filePath = join(contentDir, file);
      const raw = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error(`Invalid canvas JSON in ${file}`);
      }

      const record = parsed as Record<string, unknown>;
      const document = normalizeCanvasDocument(record, file);
      const { meta: metaFromNodes, metaNodeIds } = extractMetadataFromNodes(document.nodes);
      const metaFromRecord = extractMetadataFromRecord(record);
      const meta = mergeMetadata(metaFromRecord, metaFromNodes);

      const baseSlug = file.slice(0, -'.canvas'.length);
      const slug = meta.slug ?? baseSlug;
      const title = meta.title ?? slug;

      const filteredDocument: CanvasDocument = metaNodeIds.size
        ? {
            nodes: document.nodes.filter((node) => !metaNodeIds.has(node.id)),
            edges: document.edges.filter((edge) => !metaNodeIds.has(edge.fromNode) && !metaNodeIds.has(edge.toNode)),
          }
        : document;

      return {
        slug,
        title,
        sourceFile: file,
        document: filteredDocument,
      } satisfies CanvasBoard;
    })
  );

  const seen = new Map<string, string>();
  for (const canvas of canvases) {
    const existing = seen.get(canvas.slug);
    if (existing) {
      throw new Error(`Duplicate canvas slug "${canvas.slug}" in ${existing} and ${canvas.sourceFile}`);
    }
    seen.set(canvas.slug, canvas.sourceFile);
  }

  return canvases.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN', { numeric: true }));
}

export async function getCanvasBySlug(slug: string): Promise<CanvasBoard | undefined> {
  const canvases = await getAllCanvases();
  return canvases.find((canvas) => canvas.slug === slug);
}
