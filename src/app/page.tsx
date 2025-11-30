import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-rose-500">Home Page</h1>
      <Button> Click me </Button>
    </div>
  );
}
