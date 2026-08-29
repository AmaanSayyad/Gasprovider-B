import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col items-center bg-transparent px-4 py-0 text-foreground sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl space-y-0">{children}</div>
    </div>
  );
};

export default Layout;
