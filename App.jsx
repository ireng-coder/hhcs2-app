import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Moon, FileText, AlertTriangle, Clock, Upload } from 'lucide-react';

export default function ParticipantLog() {
  const [activeTab, setActiveTab] = useState("meals");

  // Meals State with Time Fields
  const [mealData, setMealData] = useState({
    breakfast: "",
    breakfastTime: "",
    lunch: "",
    lunchTime: "",
    dinner: "",
    dinnerTime: "",
    fluids: "",
    fluidsTime: "",
    snacks: "",
    snacksTime: "",
  });

  // Sleep State with Exact Sleep and Awake Times
  const [sleepData, setSleepData] = useState({
    sleepTime: "",
    awakeTime: "",
    quality: "Good",
    notes: "",
  });

  // Progress Notes State
  const [progressNotes, setProgressNotes] = useState("");

  // Incident Report State with Time, Witness, and Image Upload
  const [incidentData, setIncidentData] = useState({
    time: "",
    description: "",
    witness: "",
    image: null as File | null,
  });

  const handleMealChange = (field: string, value: string) => {
    setMealData(prev => ({ ...prev, [field]: value }));
  };

  const handleSleepChange = (field: string, value: string) => {
    setSleepData(prev => ({ ...prev, [field]: value }));
  };

  const handleIncidentChange = (field: string, value: any) => {
    setIncidentData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIncidentData(prev => ({ ...prev, image: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const completeLog = {
      mealData,
      sleepData,
      progressNotes,
      incidentData,
      timestamp: new Date().toISOString(),
    };
    console.log("Submitting Complete Log:", completeLog);
    alert("Daily log successfully saved!");
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-2xl font-bold text-slate-800">Participant Daily Log & Care Calendar</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="meals" className="flex items-center gap-2">
                  <Utensils className="w-4 h-4" /> Meals & Fluids
                </TabsTrigger>
                <TabsTrigger value="sleep" className="flex items-center gap-2">
                  <Moon className="w-4 h-4" /> Sleep Log
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Progress Notes
                </TabsTrigger>
                <TabsTrigger value="incident" className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Incident Report
                </TabsTrigger>
              </TabsList>

              {/* MEALS TAB */}
              <TabsContent value="meals" className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-700">Meals, Fluids & Snacks Intake</h3>
                
                {/* Breakfast */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-slate-50/50">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="breakfast">Breakfast Description</Label>
                    <Input 
                      id="breakfast" 
                      placeholder="e.g., Oatmeal, toast, and milk" 
                      value={mealData.breakfast}
                      onChange={(e) => handleMealChange("breakfast", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breakfastTime" className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Time Taken
                    </Label>
                    <Input 
                      id="breakfastTime" 
                      type="time" 
                      value={mealData.breakfastTime}
                      onChange={(e) => handleMealChange("breakfastTime", e.target.value)}
                    />
                  </div>
                </div>

                {/* Lunch */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-slate-50/50">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="lunch">Lunch Description</Label>
                    <Input 
                      id="lunch" 
                      placeholder="e.g., Rice, chicken stew, and vegetables" 
                      value={mealData.lunch}
                      onChange={(e) => handleMealChange("lunch", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lunchTime" className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Time Taken
                    </Label>
                    <Input 
                      id="lunchTime" 
                      type="time" 
                      value={mealData.lunchTime}
                      onChange={(e) => handleMealChange("lunchTime", e.target.value)}
                    />
                  </div>
                </div>

                {/* Dinner / Super */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-slate-50/50">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="dinner">Dinner / Supper Description</Label>
                    <Input 
                      id="dinner" 
                      placeholder="e.g., Mashed potatoes and fish" 
                      value={mealData.dinner}
                      onChange={(e) => handleMealChange("dinner", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dinnerTime" className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Time Taken
                    </Label>
                    <Input 
                      id="dinnerTime" 
                      type="time" 
                      value={mealData.dinnerTime}
                      onChange={(e) => handleMealChange("dinnerTime", e.target.value)}
                    />
                  </div>
                </div>

                {/* Fluids */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-slate-50/50">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="fluids">Fluids Intake (Water/Juice)</Label>
                    <Input 
                      id="fluids" 
                      placeholder="e.g., 500ml water" 
                      value={mealData.fluids}
                      onChange={(e) => handleMealChange("fluids", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fluidsTime" className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Time Taken
                    </Label>
                    <Input 
                      id="fluidsTime" 
                      type="time" 
                      value={mealData.fluidsTime}
                      onChange={(e) => handleMealChange("fluidsTime", e.target.value)}
                    />
                  </div>
                </div>

                {/* Snacks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-slate-50/50">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="snacks">Snacks Description</Label>
                    <Input 
                      id="snacks" 
                      placeholder="e.g., Apple and crackers" 
                      value={mealData.snacks}
                      onChange={(e) => handleMealChange("snacks", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snacksTime" className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Time Taken
                    </Label>
                    <Input 
                      id="snacksTime" 
                      type="time" 
                      value={mealData.snacksTime}
                      onChange={(e) => handleMealChange("snacksTime", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* SLEEP TAB */}
              <TabsContent value="sleep" className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-700">Sleep Log</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg bg-slate-50/50">
                  <div className="space-y-2">
                    <Label htmlFor="sleepTime" className="flex items-center gap-1 font-medium">
                      <Clock className="w-4 h-4" /> Sleep Time (Exact time participant went to sleep)
                    </Label>
                    <Input 
                      id="sleepTime" 
                      type="datetime-local" 
                      value={sleepData.sleepTime}
                      onChange={(e) => handleSleepChange("sleepTime", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="awakeTime" className="flex items-center gap-1 font-medium">
                      <Clock className="w-4 h-4" /> Awake Time (Exact time participant woke up)
                    </Label>
                    <Input 
                      id="awakeTime" 
                      type="datetime-local" 
                      value={sleepData.awakeTime}
                      onChange={(e) => handleSleepChange("awakeTime", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quality">Sleep Quality</Label>
                    <Select value={sleepData.quality} onValueChange={(val) => handleSleepChange("quality", val)}>
                      <SelectTrigger id="quality">
                        <SelectValue placeholder="Select sleep quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor/Restless</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="sleepNotes">Sleep Observations & Notes</Label>
                    <Textarea 
                      id="sleepNotes" 
                      placeholder="Add any details regarding nighttime awakenings or disruptions..." 
                      value={sleepData.notes}
                      onChange={(e) => handleSleepChange("notes", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* PROGRESS NOTES TAB */}
              <TabsContent value="progress" className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-700">Progress Notes</h3>
                <div className="space-y-4 p-4 border rounded-lg bg-slate-50/50">
                  <div className="space-y-2">
                    <Label htmlFor="progressNotes" className="font-medium">Write Daily Progress Notes</Label>
                    <Textarea 
                      id="progressNotes" 
                      rows={6}
                      placeholder="Detail participant's overall mood, daily activities, behaviors, and achievements..." 
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* INCIDENT REPORT TAB */}
              <TabsContent value="incident" className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-700">Incident Report</h3>
                <div className="space-y-4 p-4 border rounded-lg bg-red-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="incidentTime" className="flex items-center gap-1 font-medium">
                        <Clock className="w-4 h-4" /> Time of Incident
                      </Label>
                      <Input 
                        id="incidentTime" 
                        type="datetime-local" 
                        value={incidentData.time}
                        onChange={(e) => handleIncidentChange("time", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="witness" className="font-medium">Witness (if any)</Label>
                      <Input 
                        id="witness" 
                        placeholder="Name of staff or witness" 
                        value={incidentData.witness}
                        onChange={(e) => handleIncidentChange("witness", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incidentDescription" className="font-medium">Incident Report Details</Label>
                    <Textarea 
                      id="incidentDescription" 
                      rows={4}
                      placeholder="Describe what happened, actions taken, and immediate outcomes..." 
                      value={incidentData.description}
                      onChange={(e) => handleIncidentChange("description", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incidentImage" className="flex items-center gap-1 font-medium">
                      <Upload className="w-4 h-4" /> Upload Picture / Evidence
                    </Label>
                    <Input 
                      id="incidentImage" 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    {incidentData.image && (
                      <p className="text-xs text-emerald-600 mt-1">File selected: {incidentData.image.name}</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-8 flex justify-end">
              <Button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium">
                Save Complete Calendar Log
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
