type Task = { id: string; title: string; status: 'todo' | 'in_progress' | 'done' };

type Props = {
  tasks: Task[];
  onToggle?: (taskId: string) => void;
};

const statusColors = {
  todo: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300',
  in_progress: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300',
  done: 'bg-gradient-to-br from-green-50 to-green-100 border-green-300',
};

export default function TaskList({ tasks, onToggle }: Props) {
  return (
    <ul className="space-y-3">
      {tasks.map((t) => (
        <li key={t.id} className={`flex items-center gap-3 border-2 rounded-lg px-4 py-3 transition-all hover:shadow-md ${statusColors[t.status]}`}>
          <input
            type="checkbox"
            checked={t.status === 'done'}
            onChange={() => onToggle?.(t.id)}
            className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
          />
          <span className={`flex-1 font-medium ${t.status === 'done' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
            {t.title}
          </span>
          {t.status === 'in_progress' && (
            <span className="px-2 py-1 bg-blue-200 text-blue-700 text-xs font-semibold rounded-full">
              In Arbeit
            </span>
          )}
          {t.status === 'done' && (
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </li>
      ))}
    </ul>
  );
}
