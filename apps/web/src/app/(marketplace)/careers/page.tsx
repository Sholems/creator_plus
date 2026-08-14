import Link from 'next/link';

const positions = [
  { title: 'Full-Stack Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'Product Designer', department: 'Design', location: 'Remote', type: 'Full-time' },
  { title: 'Developer Advocate', department: 'Community', location: 'Remote', type: 'Full-time' },
  { title: 'Content Writer', department: 'Marketing', location: 'Remote', type: 'Contract' },
];

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Careers</h1>
        <p className="mt-4 text-xl text-gray-600">
          Help us build the future of digital commerce
        </p>
      </div>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Why CreatorPlus?</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: '🌍', title: 'Remote-First', description: 'Work from anywhere in the world. We believe in results, not office hours.' },
            { icon: '🚀', title: 'Fast Growth', description: 'Join a rapidly growing platform with real impact on creators and buyers globally.' },
            { icon: '💰', title: 'Competitive Pay', description: 'Top-of-market compensation, equity options, and comprehensive benefits.' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Open Positions</h2>
        <div className="space-y-3">
          {positions.map((pos) => (
            <div
              key={pos.title}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{pos.title}</h3>
                <p className="text-sm text-gray-500">{pos.department} · {pos.location} · {pos.type}</p>
              </div>
              <a
                href="mailto:careers@mycreatorplus.com"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Apply
              </a>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t see a role that fits? Send your resume to{' '}
          <a href="mailto:careers@mycreatorplus.com" className="text-blue-600 hover:text-blue-700">
            careers@mycreatorplus.com
          </a>
        </p>
      </section>
    </div>
  );
}
