import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Train, AlertCircle, RefreshCcw, Navigation } from 'lucide-react';

interface TrainRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainNumber: string;
}

export const TrainRouteModal: React.FC<TrainRouteModalProps> = ({ isOpen, onClose, trainNumber }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !trainNumber) return;
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/trains/${trainNumber}/route`)
      .then(r => r.json())
      .then(d => {
        setData(d.data || d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, trainNumber]);

  if (!isOpen) return null;

  const route = data?.route || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="flex justify-between items-center p-4 border-b border-border bg-muted/30">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <MapPin className="text-primary" size={20} />
                Train Route
              </h3>
              <p className="text-xs text-muted-foreground font-mono">Train {trainNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center p-8 animate-pulse text-muted-foreground"><RefreshCcw className="animate-spin mr-2" /> Loading timeline...</div>
            ) : route.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">Route data unavailable.</div>
            ) : (
              <div className="relative pl-6 space-y-6">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border rounded-full" />
                
                {route.map((station: any, i: number) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-background border-2 border-primary z-10" />
                    <div className="bg-muted/20 p-3 rounded-xl border border-border">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm">{station.station?.name || 'Unknown Station'}</h4>
                          <span className="text-xs text-muted-foreground">Day {station.arrivalDay || station.departureDay || 1} • {station.distance} km</span>
                        </div>
                        <div className="text-right text-xs space-y-1">
                          <div className="font-mono text-muted-foreground">Arr: <span className="font-semibold text-foreground">{station.arrival || '--:--'}</span></div>
                          <div className="font-mono text-muted-foreground">Dep: <span className="font-semibold text-foreground">{station.departure || '--:--'}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const LiveStatusModal: React.FC<TrainRouteModalProps> = ({ isOpen, onClose, trainNumber }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !trainNumber) return;
    setLoading(true);
    const date = new Date().toISOString().split('T')[0];
    fetch(`http://127.0.0.1:8000/api/trains/${trainNumber}/live?date=${date}`)
      .then(r => r.json())
      .then(d => {
        setData(d.data || d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, trainNumber]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden"
        >
          <div className="flex justify-between items-center p-4 border-b border-border bg-blue-500/10">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Navigation size={20} />
                Live Train Status
              </h3>
              <p className="text-xs text-muted-foreground">Tracking {trainNumber} in real-time</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center p-8 text-muted-foreground"><RefreshCcw className="animate-spin mr-2" /> Connecting to GPS...</div>
            ) : !data || data.error || (!data.current_station_name && !data.current_station) ? (
              <div className="text-center p-8 text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle />
                Train hasn't started yet or tracking is unavailable for today.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center p-4 bg-muted/50 rounded-full mb-2 border border-border">
                    <Train size={32} className="text-blue-500" />
                  </div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Location</h4>
                  <p className="text-2xl font-bold">{data.current_station_name || data.current_station?.StationName}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Delay</p>
                    <p className={`text-lg font-bold ${data.delay > 0 ? 'text-destructive' : 'text-green-500'}`}>
                      {data.delay > 0 ? `${data.delay} mins late` : 'On Time'}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Status</p>
                    <p className="text-lg font-bold text-foreground">
                      {data.is_arrived ? 'Arrived' : 'Departed'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const StationBoardModal: React.FC<{ isOpen: boolean; onClose: () => void; stationCode: string; stationName: string }> = ({ isOpen, onClose, stationCode, stationName }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !stationCode) return;
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/stations/${stationCode}/board`)
      .then(r => r.json())
      .then(d => {
        setData(d.data?.trains || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, stationCode]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-border bg-gradient-to-r from-orange-500/10 to-transparent">
            <div>
              <h3 className="font-bold text-2xl flex items-center gap-3 text-orange-600 dark:text-orange-400">
                <Clock size={24} />
                Live Station Board
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Arrivals and Departures at <span className="font-bold text-foreground">{stationName}</span></p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 bg-muted/10">
            {loading ? (
              <div className="flex justify-center p-12 text-muted-foreground"><RefreshCcw className="animate-spin mr-2" /> Fetching live boards...</div>
            ) : data.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground">No trains expected in the next 4 hours.</div>
            ) : (
              <div className="space-y-3">
                {data.map((train, i) => (
                  <div key={i} className="flex justify-between items-center bg-background p-4 rounded-xl border border-border shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 rounded text-muted-foreground">{train.number}</span>
                        <h4 className="font-bold text-foreground">{train.name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">{train.source} → {train.destination}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg">{train.expected_arrival}</div>
                      <div className={`text-xs font-bold ${train.delay > 0 ? 'text-destructive' : 'text-green-500'}`}>
                        {train.delay > 0 ? `Late by ${train.delay}m` : 'On Time'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
