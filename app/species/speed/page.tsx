import AnimalSpeedGraph from "../animal-speed-graph";

export default function SpeedPage() {
  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">Species Speed</h2>
      </div>

      <div className="rounded border p-4">
        <AnimalSpeedGraph />
      </div>
    </div>
  );
}
