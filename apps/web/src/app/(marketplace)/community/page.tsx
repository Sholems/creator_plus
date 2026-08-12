import Link from 'next/link';

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Community</h1>
        <p className="mt-4 text-xl text-gray-600">
          Connect with creators and buyers from around the world
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 mb-12">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-3xl mb-3">💬</div>
          <h3 className="text-lg font-semibold text-gray-900">Discord</h3>
          <p className="mt-2 text-sm text-gray-600">
            Join our Discord server to chat with creators, share feedback, and get help in real-time.
          </p>
          <a
            href="#"
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Join Discord →
          </a>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-3xl mb-3">🐦</div>
          <h3 className="text-lg font-semibold text-gray-900">Twitter</h3>
          <p className="mt-2 text-sm text-gray-600">
            Follow us for product launches, creator spotlights, and marketplace updates.
          </p>
          <a
            href="#"
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Follow @CreatorPlus →
          </a>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-3xl mb-3">📝</div>
          <h3 className="text-lg font-semibold text-gray-900">Blog</h3>
          <p className="mt-2 text-sm text-gray-600">
            Read articles about digital product trends, creator stories, and platform updates.
          </p>
          <Link
            href="/blog"
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Read the Blog →
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-3xl mb-3">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900">Events</h3>
          <p className="mt-2 text-sm text-gray-600">
            Join creator workshops, AMAs, and virtual meetups to learn and network.
          </p>
          <span className="mt-4 inline-flex items-center text-sm font-medium text-gray-400">
            Coming Soon
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-gray-900 p-8 text-center text-white">
        <h2 className="text-xl font-bold">Join the Conversation</h2>
        <p className="mt-2 text-gray-400">
          Share your work, get feedback, and connect with fellow creators.
        </p>
        <a
          href="#"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
        >
          Join Our Discord
        </a>
      </div>
    </div>
  );
}
