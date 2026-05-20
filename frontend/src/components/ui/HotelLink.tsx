import Link from "next/link";

import { propertyPath } from "@/lib/property";

type Props = {
  name: string;
  className?: string;
};

export function HotelLink({ name, className = "" }: Props) {
  return (
    <Link
      href={propertyPath(name)}
      className={`font-medium text-indigo-600 underline-offset-2 transition hover:text-indigo-500 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 ${className}`}
    >
      {name}
    </Link>
  );
}
