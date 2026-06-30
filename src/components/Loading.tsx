import { Zap } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center animate-pulse">
        <Zap size={20} className="text-black fill-black" />
      </div>
    </div>
  );
}
