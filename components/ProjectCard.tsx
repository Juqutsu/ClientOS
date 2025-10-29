import Link from 'next/link';

type Props = {
  name: string;
  clientName?: string | null;
  description?: string | null;
  href?: string;
};

export default function ProjectCard({ name, clientName, description, href }: Props) {
  const content = (
    <div className="border rounded-lg p-4 hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{name}</h3>
        {clientName ? <span className="text-xs text-gray-500">{clientName}</span> : null}
      </div>
      {description ? <p className="text-sm text-gray-600 mt-2 line-clamp-2">{description}</p> : null}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
