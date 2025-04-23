"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sidebar } from "@/components/sidebar";
import { Menu, MapPin } from "lucide-react";
import { useSidebar } from "@/lib/sidebar-context";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export default function MapsPage() {
  const { showSidebar, setShowSidebar, toggleSidebar } = useSidebar();
  const [map, setMap] = useState<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );

  useEffect(() => {
    // Initialize the map
    const newMap = L.map("map").setView([51.505, -0.09], 13); // Default center (London)
    setMap(newMap);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(newMap);

    return () => {
      newMap.remove(); // Cleanup when unmounting
    };
  }, []);

  const handleGetLocation = () => {
    if (!map) return;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);

          // Update the map view
          map.setView([latitude, longitude], 15);

          // Add a marker for the user's location
          L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup("You are here!")
            .openPopup();
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar (Increased z-index to 40) */}
      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } fixed md:static inset-y-0 left-0 z-40 md:transform-none md:transition-none transition-transform duration-300 ease-in-out`}
      >
        <Sidebar
          onClose={toggleSidebar}
          isMobile={true}
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen relative">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 md:hidden text-gray-500 dark:text-gray-400"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              Maps
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Avatar className="h-8 w-8">
              <img src="/placeholder.svg?height=32&width=32" alt="User" />
            </Avatar>
          </div>
        </div>

        {/* Maps content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mt-5 overflow-hidden h-[calc(100vh-12rem)] relative">
              {/* Map (Set z-index lower to ensure sidebar stays on top) */}
              <div id="map" className="w-full h-full absolute inset-0 z-10" />
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleGetLocation}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <MapPin className="mr-2 h-5 w-5" /> Get Current Location
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
