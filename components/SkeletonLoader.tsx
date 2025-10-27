import React from 'react';

const SkeletonCard = () => (
    <div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded-xl w-full aspect-video mb-2 animate-pulse"></div>
        <div className="flex items-start">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-9 h-9 mr-3 mt-1 animate-pulse"></div>
            <div className="flex-1 space-y-2 py-1">
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-3/4 animate-pulse"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-3 w-1/2 animate-pulse"></div>
            </div>
        </div>
    </div>
);

const HomeViewSkeleton = () => (
    <div>
        <div className="bg-gray-200 dark:bg-gray-700 rounded h-8 w-1/3 mb-6 animate-pulse"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    </div>
);

const SidebarSkeleton = () => (
    <nav className="w-20 lg:w-64 bg-white dark:bg-gray-800 p-2 lg:p-4 flex flex-col justify-between border-r border-gray-200 dark:border-gray-700">
        <div>
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center p-3 my-1 w-full rounded-lg">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-6 h-6 animate-pulse"></div>
                    <div className="ml-4 bg-gray-200 dark:bg-gray-700 rounded h-4 flex-1 hidden lg:block animate-pulse"></div>
                </div>
            ))}
        </div>
        <div className="p-2 lg:p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
             <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-4 w-2/3 mx-auto lg:mx-0 lg:w-1/2 mb-2 animate-pulse"></div>
             <div className="bg-gray-300 dark:bg-gray-600 rounded-full h-2.5 w-full animate-pulse"></div>
             <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-3 w-full mt-2 animate-pulse"></div>
        </div>
    </nav>
);

const HeaderSkeleton = () => (
    <header className="bg-white dark:bg-gray-800 shadow-md p-2 fixed top-0 left-0 right-0 z-20 flex items-center justify-between">
        <div className="flex items-center ml-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-8 h-8 animate-pulse"></div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded h-6 w-40 ml-2 hidden sm:block animate-pulse"></div>
        </div>
        <div className="flex-1 max-w-lg mx-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-10 w-full animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-4 mr-4">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-8 h-8 animate-pulse"></div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full w-8 h-8 animate-pulse"></div>
        </div>
    </header>
);


const SkeletonLoader: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col h-screen">
            <HeaderSkeleton />
            <div className="flex flex-1 pt-16 overflow-hidden">
                <SidebarSkeleton />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <HomeViewSkeleton />
                </main>
            </div>
        </div>
    );
};

export default SkeletonLoader;
