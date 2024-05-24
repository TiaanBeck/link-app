// app/layout.js
import "@/styles/globals.scss";
import { PrismicPreview } from "@prismicio/next";
import { repositoryName, createClient } from "@/prismicio";
import { AuthProvider } from '@/contexts/AuthContext';
import ClientHeader from '@/components/ClientHeader';
import GoogleAnalytics from '@/components/GoogleAnalytics';


async function fetchSettingsAndNavigation() {
  const client = createClient();
  const settings = await client.getSingle("settings");
  const navigation = await client.getSingle("navigation");
  const page = await client.getByUID("page", "home");
  return { settings, navigation, page };
}

export default async function RootLayout({ children }) {
  const { settings, navigation, page } = await fetchSettingsAndNavigation();

  return (
    <html lang="en">
      <head>
        <title>{page.data.page_title}</title>
        <meta name="title" content={page.data.page_title} />
        <meta name="description" content={page.data.meta_description} />
        {settings.data.noIndex && <meta name="robots" content="noindex" />}
        {settings.data.noFollow && <meta name="robots" content="nofollow" />}
        <meta name="favicon" content={settings.data.favicon.url} />
        <link rel="icon" href={settings.data.favicon.url} type="image/png" />
        {
          settings.data.openGraphImage && (
            <>
              <meta property="og:type" content="website" />
              <meta property="og:url" content={"https://fansl.ink/"} />
              <meta property="og:title" content={page.data.meta_title} />
              <meta property="og:description" content={page.data.meta_description} />
              <meta property="og:image" content={settings.data.meta_image.url} />
            </>
          )
        }
        <GoogleAnalytics trackingId={settings.data.googleAnalyticsTag} />
      </head>
      <body>
        <AuthProvider>
          <ClientHeader settings={settings} navigation={navigation} />
          {children}
        </AuthProvider>
        <PrismicPreview repositoryName={repositoryName} />
      </body>
    </html>
  );
}
