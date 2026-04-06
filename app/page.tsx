import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-gray-900 rounded-lg">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Kingshot Tools
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Powerful tools for Kingshot players
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <Link
              href="/(tools)/beartrap"
              className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950 transition-colors"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Bear Trap
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Optimize your bear trap event formation
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
