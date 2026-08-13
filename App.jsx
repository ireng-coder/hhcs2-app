import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Utensils, Moon, FileText, AlertTriangle, Clock, Upload, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

export default function ParticipantCareCalendar() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
    witness: "",
    description: "",
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
      date: selectedDate,
      mealData,
      sleepData,
      progressNotes,
      incidentData,
      timestamp: new Date().toISOString(),
    };
    console.log("Submitting Complete Calendar Log:", completeLog);
    alert(`Care log for ${selectedDate} successfully saved!`);
  };

  // Generate a mock multi-day calendar matrix for the month view
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans">
      <Card className="shadow-xl border-slate-200">
        <CardHeader className="bg-slate-900 text-white rounded-t-lg flex flex-row items-center justify-between px-6 py-4">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-400" /> Participant Daily Care Calendar & Log
            </CardTitle>
            <p className="text-sm text-slate-300 mt-1">Comprehensive daily shift tracker, meal times, sleep, progress, and incident reporting</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-md border border-slate-700">
            <Label htmlFor="calendarDate" className="text-xs text-slate-300 font-medium">Log Date:</Label>
            <Input 
              id="calendarDate" 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-900 text-white border-slate-600 text-sm h-8 px-2"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-6 bg-slate-50/50">
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-5 mb-6 bg-slate-200/80 p-1 rounded-lg">
                <TabsTrigger value="calendar" className="flex items-center gap-1.5 font-medium">
                  <CalendarIcon className="w-4 h-4" /> Calendar View
                </TabsTrigger>
                <TabsTrigger value="meals" className="flex items-center gap-1.5 font-medium">
                  <Utensils className="w-4 h-4" /> Meals & Fluids
                </TabsTrigger>
                <TabsTrigger value="sleep" className="flex items-center gap-1.5 font-medium">
                  <Moon className="w-4 h-4" /> Sleep Log
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-1.5 font-medium">
                  <FileText className="w-4 h-4" /> Progress Notes
                </TabsTrigger>
                <TabsTrigger value="incident" className="flex items-center gap-1.5 font-medium text-red-600 data-[state=active]:text-red-700">
                  <AlertTriangle className="w-4 h-4" /> Incident Report
                </TabsTrigger>
              </TabsList>

              {/* CALENDAR MANAGEMENT TAB */}
              <TabsContent value="calendar" className="space-y-6">
                <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Monthly Care Calendar Matrix</h3>
                      <p className="text-xs text-slate-500">Select any day to review status or jump directly to daily reporting sections.</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Logged</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Pending Review</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block"></span> Empty</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center font-semibold text-slate-600 text-xs py-2 bg-slate-100 rounded-lg">
                    <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {daysInMonth.map((day) => {
                      const formattedDay = `2026-03-${day < 10 ? '0' + day : day}`;
                      const isSelected = selectedDate === formattedDay;
                      return (
                        <div 
                          key={day}
                          onClick={() => setSelectedDate(formattedDay)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between h-24 ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-400/30' 
                              : 'bg-white hover:border-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{day}</span>
                            {day <= 12 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                          <div className="text-[10px] text-slate-500 space-y-0.5 text-left">
                            {day % 2 === 0 ? <p className="text-emerald-700 font-medium">Meals: Complete</p> : <p className="text-amber-600">Meals: Pending</p>}
                            {day === 3 && <p className="text-red-600 font-bold">1 Incident</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* MEALS & FLUIDS TAB */}
              <TabsContent value="meals" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-700">Meals, Fluids & Snacks Intake</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Date: {selectedDate}</span>
                </div>
                
                {/* Breakfast */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-white shadow-sm">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="breakfast">Breakfast Description</Label>
                    <Input 
                      id="breakfast" 
                      placeholder="e.g., Oatmeal, eggs, toast, and milk" 
                      value={mealData.breakfast}
                      onChange={(e) => handleMealChange("breakfast", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breakfastTime" className="flex items-center gap-1 font-medium text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Exact Time Taken
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-white shadow-sm">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="lunch">Lunch Description</Label>
                    <Input 
                      id="lunch" 
                      placeholder="e.g., Rice, chicken stew, and steamed vegetables" 
                      value={mealData.lunch}
                      onChange={(e) => handleMealChange("lunch", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lunchTime" className="flex items-center gap-1 font-medium text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Exact Time Taken
                    </Label>
                    <Input 
                      id="lunchTime" 
                      type="time" 
                      value={mealData.lunchTime}
                      onChange={(e) => handleMealChange("lunchTime", e.target.value)}
                    />
                  </div>
                </div>

                {/* Dinner / Supper */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-white shadow-sm">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="dinner">Dinner / Supper Description</Label>
                    <Input 
                      id="dinner" 
                      placeholder="e.g., Mashed potatoes, baked fish, soup" 
                      value={mealData.dinner}
                      onChange={(e) => handleMealChange("dinner", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dinnerTime" className="flex items-center gap-1 font-medium text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Exact Time Taken
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-white shadow-sm">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="fluids">Fluids Intake (Water / Juice / Tea)</Label>
                    <Input 
                      id="fluids" 
                      placeholder="e.g., 500ml water, 200ml orange juice" 
                      value={mealData.fluids}
                      onChange={(e) => handleMealChange("fluids", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fluidsTime" className="flex items-center gap-1 font-medium text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Exact Time Taken
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-white shadow-sm">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="snacks">Snacks Description</Label>
                    <Input 
                      id="snacks" 
                      placeholder="e.g., Apple slices and whole grain crackers" 
                      value={mealData.snacks}
                      onChange={(e) => handleMealChange("snacks", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="snacksTime" className="flex items-center gap-1 font-medium text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Exact Time Taken
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

              {/* SLEEP LOG TAB */}
              <TabsContent value="sleep" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-700">Sleep & Rest Log</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Date: {selectedDate}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border rounded-lg bg-white shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="sleepTime" className="flex items-center gap-1 font-medium">
                      <Clock className="w-4 h-4 text-indigo-600" /> Sleep Time (Exact time participant went to sleep)
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
                      <Clock className="w-4 h-4 text-indigo-600" /> Awake Time (Exact time participant woke up)
                    </Label>
                    <Input 
                      id="awakeTime" 
                      type="datetime-local" 
                      value={sleepData.awakeTime}
                      onChange={(e) => handleSleepChange("awakeTime", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quality">Sleep Quality Evaluation</Label>
                    <Select value={sleepData.quality} onValueChange={(val) => handleSleepChange("quality", val)}>
                      <SelectTrigger id="quality" className="bg-white">
                        <SelectValue placeholder="Select sleep quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor / Restless</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="sleepNotes">Sleep Observations & Night Notes</Label>
                    <Textarea 
                      id="sleepNotes" 
                      rows={3}
                      placeholder="Add any details regarding nighttime awakenings, restlessness, or assistance needed..." 
                      value={sleepData.notes}
                      onChange={(e) => handleSleepChange("notes", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* PROGRESS NOTES TAB */}
              <TabsContent value="progress" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-700">Progress Notes</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Date: {selectedDate}</span>
                </div>

                <div className="space-y-4 p-5 border rounded-lg bg-white shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="progressNotesField" className="font-medium text-slate-800">Write Daily Progress Report Notes</Label>
                    <p className="text-xs text-slate-500">Document participant's daily behavior, social interactions, emotional state, activities completed, and overall progress towards goals.</p>
                    <Textarea 
                      id="progressNotesField" 
                      rows={8}
                      placeholder="Enter detailed daily progress notes here..." 
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* INCIDENT REPORT TAB */}
              <TabsContent value="incident" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" /> Incident Report Form
                  </h3>
                  <span className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">Date: {selectedDate}</span>
                </div>

                <div className="space-y-5 p-5 border border-red-200 rounded-lg bg-red-50/30 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="incidentTime" className="flex items-center gap-1 font-medium">
                        <Clock className="w-4 h-4 text-red-600" /> Time of Incident
                      </Label>
                      <Input 
                        id="incidentTime" 
                        type="datetime-local" 
                        value={incidentData.time}
                        onChange={(e) => handleIncidentChange("time", e.target.value)}
                        className="bg-white border-red-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="witness" className="font-medium">Witness (if any)</Label>
                      <Input 
                        id="witness" 
                        placeholder="Name of staff member or witness present" 
                        value={incidentData.witness}
                        onChange={(e) => handleIncidentChange("witness", e.target.value)}
                        className="bg-white border-red-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incidentDescription" className="font-medium">Incident Report Details & Description</Label>
                    <Textarea 
                      id="incidentDescription" 
                      rows={5}
                      placeholder="Describe exactly what happened, immediate triggers, actions taken by staff, and outcomes..." 
                      value={incidentData.description}
                      onChange={(e) => handleIncidentChange("description", e.target.value)}
                      className="bg-white border-red-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incidentImage" className="flex items-center gap-1 font-medium">
                      <Upload className="w-4 h-4 text-red-600" /> Upload Incident Picture / Evidence / Document
                    </Label>
                    <Input 
                      id="incidentImage" 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="bg-white border-red-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                    />
                    {incidentData.image && (
                      <p className="text-xs text-emerald-700 font-medium mt-1">File attached: {incidentData.image.name}</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-8 flex justify-between items-center border-t pt-4">
              <p className="text-xs text-slate-500">All entries are securely bound to the care calendar date: <span className="font-semibold text-slate-700">{selectedDate}</span></p>
              <Button type="submit" className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md">
                Save Complete Calendar Log
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
