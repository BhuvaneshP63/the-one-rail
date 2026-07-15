import React, { createContext, useState } from 'react';

export const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useState({
    from: '',
    fromName: '',
    to: '',
    toName: '',
    date: new Date().toISOString().split('T')[0],
    seatClass: 'SL',
    passengerCount: 1
  });

  const [searchResults, setSearchResults] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [selectedClass, setSelectedClass] = useState('SL');
  const [passengers, setPassengers] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);

  const resetBookingFlow = () => {
    setSelectedTrain(null);
    setSelectedClass('SL');
    setPassengers([]);
    setCurrentOrder(null);
  };

  return (
    <BookingContext.Provider
      value={{
        searchParams,
        setSearchParams,
        searchResults,
        setSearchResults,
        selectedTrain,
        setSelectedTrain,
        selectedClass,
        setSelectedClass,
        passengers,
        setPassengers,
        currentOrder,
        setCurrentOrder,
        resetBookingFlow
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};
