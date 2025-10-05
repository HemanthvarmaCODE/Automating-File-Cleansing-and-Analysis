import React from 'react';
import Navbar from './Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative">
      <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-background to-background/90 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-primary/10 via-transparent to-transparent animate-gradient-glow"></div>
      
      <div className="relative z-10">
        <Navbar />
        <main>{children}</main>
      </div>
    </div>
  );
};

export default PageLayout;