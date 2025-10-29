type Task = { id: string; title: string; status: 'todo' | 'in_progress' | 'done' };

type Props = {
  tasks: Task[];
  onToggle?: (taskId: string) => void;
};

export default function TaskList({ tasks, onToggle }: Props) {
  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 border rounded-md px-3 py-2">
          <input
            type="checkbox"
            checked={t.status === 'done'}
            onChange={() => onToggle?.(t.id)}
            className="h-4 w-4"
          />
          <span className={t.status === 'done' ? 'line-through text-gray-400' : ''}>{t.title}</span>
        </li>
      ))}
    </ul>
  );
}
