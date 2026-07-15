const Schedule = require('../models/Schedule');

// Programmatic seat type allocator based on standard Indian Railways layouts
function getSeatType(classType, seatNumber) {
  if (classType === 'SL' || classType === '3A') {
    const mod = seatNumber % 8;
    if (mod === 1 || mod === 4) return 'LB'; // Lower Berth
    if (mod === 2 || mod === 5) return 'MB'; // Middle Berth
    if (mod === 3 || mod === 6) return 'UB'; // Upper Berth
    if (mod === 7) return 'SL';              // Side Lower
    return 'SU';                             // Side Upper
  } else if (classType === '2A') {
    // 2AC has 6-berth cabins (no middle berth)
    const mod = seatNumber % 6;
    if (mod === 1 || mod === 3) return 'LB';
    if (mod === 2 || mod === 4) return 'UB';
    if (mod === 5) return 'SL';
    return 'SU';
  } else if (classType === '1A') {
    // 1AC has coupes (2 berths) or cabins (4 berths)
    const mod = seatNumber % 4;
    if (mod === 1 || mod === 3) return 'LB';
    return 'UB';
  } else {
    // CC (Chair Car) or 2S (Second Seating) - Window/Middle/Aisle
    const mod = seatNumber % 6;
    if (mod === 1 || mod === 0) return 'WS'; // Window Side
    if (mod === 2 || mod === 5) return 'SM'; // Side Middle (or Middle)
    return 'SM'; // Aisle/Other
  }
}

// Generate default seats for a train based on its classes
function generateDefaultSeats(classes) {
  const seats = [];

  classes.forEach(cls => {
    let coaches = [];
    let seatsPerCoach = 72;

    if (cls === 'SL') {
      coaches = ['S1', 'S2'];
      seatsPerCoach = 72;
    } else if (cls === '3A') {
      coaches = ['B1', 'B2'];
      seatsPerCoach = 72;
    } else if (cls === '2A') {
      coaches = ['A1'];
      seatsPerCoach = 46;
    } else if (cls === '1A') {
      coaches = ['H1'];
      seatsPerCoach = 24;
    } else if (cls === 'CC') {
      coaches = ['C1'];
      seatsPerCoach = 60;
    } else if (cls === '2S') {
      coaches = ['D1', 'D2'];
      seatsPerCoach = 90;
    }

    coaches.forEach(coach => {
      for (let i = 1; i <= seatsPerCoach; i++) {
        seats.push({
          coach,
          seatNumber: i,
          classType: cls,
          seatType: getSeatType(cls, i),
          bookings: []
        });
      }
    });
  });

  return seats;
}

// Check if a seat is available for the segment [fromIndex, toIndex]
function isSeatAvailable(seat, fromIndex, toIndex) {
  for (const booking of seat.bookings) {
    // Check overlap: booking interval overlaps with requested interval
    const hasOverlap = booking.fromStopIndex < toIndex && booking.toStopIndex > fromIndex;
    if (hasOverlap) return false;
  }
  return true;
}

// Get or Create Schedule
const getOrCreateSchedule = async (trainId, date, classes) => {
  let schedule = await Schedule.findOne({ train: trainId, date });
  if (!schedule) {
    const seats = generateDefaultSeats(classes);
    schedule = new Schedule({
      train: trainId,
      date,
      seats
    });
    await schedule.save();
  }
  return schedule;
};

// Check seat availability for a route segment
const checkAvailability = async (trainId, date, classType, fromIndex, toIndex, classes) => {
  const schedule = await getOrCreateSchedule(trainId, date, classes);
  const classSeats = schedule.seats.filter(seat => seat.classType === classType);
  
  let availableCount = 0;
  classSeats.forEach(seat => {
    if (isSeatAvailable(seat, fromIndex, toIndex)) {
      availableCount++;
    }
  });

  return {
    totalSeats: classSeats.length,
    availableSeats: availableCount
  };
};

// Allocate seats for a booking request
const allocateBookingSeats = async (schedule, classType, fromIndex, toIndex, passengerCount) => {
  const classSeats = schedule.seats.filter(seat => seat.classType === classType);
  const allocated = [];

  for (const seat of classSeats) {
    if (isSeatAvailable(seat, fromIndex, toIndex)) {
      allocated.push(seat);
      if (allocated.length === passengerCount) {
        break;
      }
    }
  }

  if (allocated.length < passengerCount) {
    return null; // Not enough seats available
  }

  return allocated;
};

module.exports = {
  getOrCreateSchedule,
  checkAvailability,
  allocateBookingSeats,
  generateDefaultSeats
};
