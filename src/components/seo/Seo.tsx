import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  canonicalPath?: string;
};

function upsertMetaTag(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLinkTag(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function Seo({ title, description, canonicalPath }: SeoProps) {
  useEffect(() => {
    document.title = title;
    upsertMetaTag("description", description);

    const canonicalHref = canonicalPath
      ? `${window.location.origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`
      : window.location.href;

    upsertLinkTag("canonical", canonicalHref);
  }, [title, description, canonicalPath]);

  return null;
}
