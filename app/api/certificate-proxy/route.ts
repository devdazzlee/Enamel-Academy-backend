import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    );
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const fetchHeaders: Record<string, string> = {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; CertificateProxy/1.0)",
    };

    if (authHeader) {
      fetchHeaders["Authorization"] = authHeader;
    }

    const response = await fetch(url, {
      headers: fetchHeaders,
      redirect: "follow",
    });

    let html = await response.text();

    // Determine the base URL from the fetched URL for resolving relative paths
    const baseUrl = new URL(url).origin;

    // Add a <base> tag so relative URLs (images, CSS) resolve correctly
    if (!html.includes("<base")) {
      html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}" />`);
    }

    // Inline images as base64 to avoid cross-origin issues with html2canvas
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let imgMatch;
    const imageUrls = new Set<string>();
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const src = imgMatch[1];
      if (src && !src.startsWith("data:")) {
        imageUrls.add(src);
      }
    }

    // Also find background-image URLs in inline styles
    const bgRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
    let bgMatch;
    while ((bgMatch = bgRegex.exec(html)) !== null) {
      const src = bgMatch[1];
      if (src && !src.startsWith("data:")) {
        imageUrls.add(src);
      }
    }

    // Fetch and inline each image
    for (const imgSrc of imageUrls) {
      try {
        const absUrl = imgSrc.startsWith("http")
          ? imgSrc
          : new URL(imgSrc, url).href;
        const imgResponse = await fetch(absUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; CertificateProxy/1.0)" },
        });
        if (imgResponse.ok) {
          const buffer = await imgResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const contentType =
            imgResponse.headers.get("content-type") || "image/png";
          const dataUri = `data:${contentType};base64,${base64}`;
          // Replace all occurrences of this image URL
          html = html.split(imgSrc).join(dataUri);
        }
      } catch {
        // Skip failed images silently
      }
    }

    // Inline external stylesheets to avoid CORS issues
    const linkRegex =
      /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*\/?>/gi;
    let linkMatch;
    const cssReplacements: { original: string; replacement: string }[] = [];
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      try {
        const cssUrl = linkMatch[1].startsWith("http")
          ? linkMatch[1]
          : new URL(linkMatch[1], url).href;
        const cssResponse = await fetch(cssUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; CertificateProxy/1.0)" },
        });
        if (cssResponse.ok) {
          const cssText = await cssResponse.text();
          cssReplacements.push({
            original: linkMatch[0],
            replacement: `<style>${cssText}</style>`,
          });
        }
      } catch {
        // Skip failed stylesheets silently
      }
    }

    for (const { original, replacement } of cssReplacements) {
      html = html.replace(original, replacement);
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Certificate proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificate HTML" },
      { status: 500 }
    );
  }
}
