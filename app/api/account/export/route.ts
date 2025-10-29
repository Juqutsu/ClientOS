import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  // Workspaces where user is a member
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id);
  const workspaceIds = (memberships || []).map((m) => m.workspace_id);

  // Fetch projects, tasks, files within those workspaces
  const { data: projects } = workspaceIds.length
    ? await supabase.from('projects').select('*').in('workspace_id', workspaceIds)
    : ({ data: [] } as { data: Array<Record<string, unknown>> });
  const projectsData = (projects as Array<{ id: string }> | null) || [];
  const projectIds = projectsData.map((p) => p.id);

  const [{ data: tasks }, { data: files }] = projectIds.length
    ? await Promise.all([
        supabase.from('tasks').select('*').in('project_id', projectIds),
        supabase.from('files').select('*').in('project_id', projectIds),
      ])
    : [{ data: [] }, { data: [] }];

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();

  const payload = { user, profile, memberships, projects, tasks, files };
  return NextResponse.json(payload, {
    headers: {
      'content-disposition': 'attachment; filename="account-export.json"',
    },
  });
}
