import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { articles } from "../articles";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: `${article.title} | Support Coach AI`,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      publishedTime: article.date,
      ...(article.image ? { images: [article.image] } : {}),
    },
  };
}

const mdComponents = {
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="text-xl font-semibold text-white mt-10 mb-3" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="text-gray-300 leading-relaxed mb-4" {...props} />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="text-white font-semibold" {...props} />
  ),
  em: (props: React.ComponentProps<"em">) => <em className="text-gray-400" {...props} />,
  a: (props: React.ComponentProps<"a">) => (
    <a className="text-emerald-500 hover:underline" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-300" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="list-decimal pl-6 space-y-2 mb-4 text-gray-300" {...props} />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="border-l-4 border-emerald-700 pl-4 italic text-gray-200 my-4"
      {...props}
    />
  ),
  img: (props: React.ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={props.alt ?? ""}
      className="rounded-xl border border-gray-800 my-6 mx-auto max-w-full"
    />
  ),
  table: (props: React.ComponentProps<"table">) => (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  th: (props: React.ComponentProps<"th">) => (
    <th className="border border-gray-800 bg-gray-900 px-3 py-2 text-left text-white" {...props} />
  ),
  td: (props: React.ComponentProps<"td">) => (
    <td className="border border-gray-800 px-3 py-2 text-gray-300" {...props} />
  ),
};

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: { "@type": "Organization", name: "Support Coach AI", url: "https://www.supportcoach.io" },
    ...(article.image ? { image: `https://www.supportcoach.io${article.image}` } : {}),
  };

  return (
    <div className="min-h-screen bg-black text-gray-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/blog" className="text-emerald-500 text-sm hover:underline">
          ← All articles
        </Link>
        <h1 className="text-3xl font-bold text-white mt-4 mb-3 leading-tight">{article.title}</h1>
        <p className="text-gray-500 text-sm mb-10">Support Coach AI · September 2026</p>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {article.body}
        </ReactMarkdown>
        <div className="mt-12 rounded-xl border border-gray-800 bg-gray-950 p-6">
          <p className="text-white font-semibold mb-1">
            Catch the risky reply before your customer reads it.
          </p>
          <p className="text-gray-400 text-sm mb-3">
            Support Coach works inside Zoho SalesIQ, Zendesk and Intercom. $15 per agent per
            month, 14-day free trial, no card.
          </p>
          <Link href="/extension" className="text-emerald-500 text-sm hover:underline">
            See how it works →
          </Link>
        </div>
      </div>
    </div>
  );
}
