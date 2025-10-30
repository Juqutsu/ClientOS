import Link from 'next/link';

type Props = {
  name: string;
  clientName?: string | null;
  description?: string | null;
  href?: string;
};

const gradients = [
  'from-blue-50 to-blue-100 border-blue-200',
  'from-purple-50 to-purple-100 border-purple-200',
  'from-pink-50 to-pink-100 border-pink-200',
  'from-indigo-50 to-indigo-100 border-indigo-200',
  'from-cyan-50 to-cyan-100 border-cyan-200',
  'from-teal-50 to-teal-100 border-teal-200',
];

export default function ProjectCard({ name, clientName, description, href }: Props) {
  const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
  
  const content = (
    <div className={`bg-gradient-to-br ${randomGradient} rounded-xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 border group cursor-pointer`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-gray-900 group-hover:text-primary-700 transition-colors mb-1">{name}</h3>
          {clientName ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {clientName}
            </div>
          ) : null}
        </div>
        <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
          <svg className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
      {description ? (
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{description}</p>
      ) : (
        <p className="text-sm text-gray-500 italic">Keine Beschreibung</p>
      )}
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
