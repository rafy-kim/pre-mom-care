import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";
import { ClerkApp, useAuth } from "@clerk/remix";
import { rootAuthLoader } from "@clerk/remix/ssr.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  {
    rel: "icon",
    type: "image/png",
    href: "/ansimi.png?v=1",
  },
  {
    rel: "apple-touch-icon",
    href: "/apple-touch-icon.png",
  },
  {
    rel: "apple-touch-icon-precomposed",
    href: "/apple-touch-icon-precomposed.png",
  },
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css",
  },
];

export const loader: LoaderFunction = (args) => rootAuthLoader(args);

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no" 
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <Meta />
        <Links />
      </head>
      <body className="touch-manipulation" suppressHydrationWarning={true}>
        {children}
        <ScrollRestoration />
        <Scripts />
        {/* 포트원 V2 SDK - ES6 Module 방식 */}
        <script type="module" dangerouslySetInnerHTML={{
          __html: `
            import * as PortOne from "https://cdn.portone.io/v2/browser-sdk.esm.js";
            
            // 글로벌 변수로 설정하여 React 컴포넌트에서 사용 가능하게 함
            window.PortOneSDK = PortOne;
            
            console.log('🌐 PortOne SDK imported:', PortOne);
            console.log('✅ PortOne requestPayment available:', typeof PortOne.requestPayment === 'function');
          `
        }} />
      </body>
    </html>
  );
}

function App() {
  const { userId } = useAuth();
  const location = useLocation();
  const showHeader = !!userId && location.pathname !== "/";

  return (
    <>
      <Outlet />
    </>
  );
}

export default ClerkApp(App);
