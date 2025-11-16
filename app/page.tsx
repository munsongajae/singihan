import NewsScraper from './components/NewsScraper';

export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <NewsScraper />
    </main>
  );
}

