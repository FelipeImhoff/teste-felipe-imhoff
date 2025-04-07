import { Link } from "react-router-dom"

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <h1 className="text-6xl font-bold text-sky-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-500 mb-2">Página não encontrada</h2>
      <p className="text-gray-600 mb-6">
        Opa! A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        to="/"
        className="px-6 py-2 bg-emerald-500 text-gray-900 rounded-full hover:bg-emerald-800 transition-colors"
      >
        Voltar para a página inicial
      </Link>
    </div>
  );
}

export default NotFound
