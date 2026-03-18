import { NextResponse } from 'next/server';
export const revalidate = 0;
import { promises as fs } from 'fs';
import path from 'path';

function getProjectRoot(): string {
  if (process.env.AIOS_PROJECT_ROOT) {
    return process.env.AIOS_PROJECT_ROOT;
  }
  return path.resolve(process.cwd(), '..', '..');
}

const KANBAN_ORDER_FILE = 'kanban-order.json';

export async function GET() {
  try {
    const projectRoot = getProjectRoot();
    const filePath = path.join(projectRoot, 'docs', KANBAN_ORDER_FILE);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json(JSON.parse(content));
    } catch (error) {
      // If file doesn't exist, return empty order
      return NextResponse.json({
        backlog: [],
        in_progress: [],
        ai_review: [],
        human_review: [],
        pr_created: [],
        done: [],
        error: [],
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load kanban order' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectRoot = getProjectRoot();
    const filePath = path.join(projectRoot, 'docs', KANBAN_ORDER_FILE);

    await fs.writeFile(filePath, JSON.stringify(body, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Kanban order saved successfully' });
  } catch (error) {
    console.error('Error saving kanban order:', error);
    return NextResponse.json({ error: 'Failed to save kanban order' }, { status: 500 });
  }
}
