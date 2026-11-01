export function getLowerBerthPriority({ passengers, selectedSeats, coachSeats, activePassengerIndex, seniorCitizenAge = 60 }) {
  const waitingSeniors = passengers.some((passenger, index) => Number(passenger.age) >= seniorCitizenAge && !Number.isInteger(selectedSeats[index]));
  const waitingWomen = passengers.some((passenger, index) => passenger.gender === 'Female' && !Number.isInteger(selectedSeats[index]));
  const activePassenger = passengers[activePassengerIndex] || {};
  const activeIsSenior = Number(activePassenger.age) >= seniorCitizenAge;
  const activeIsWoman = activePassenger.gender === 'Female';
  const recommendLowerForActive = activeIsSenior || (!waitingSeniors && activeIsWoman);
  const maleLowerBerthSelections = passengers.flatMap((passenger, index) => {
    const berth = coachSeats.find(seat => seat.seatNumber === selectedSeats[index] && seat.seatType === 'LB');
    return passenger.gender === 'Male' && berth ? [{ passengerIndex: index, seatNumber: berth.seatNumber }] : [];
  });

  let guidance;
  if (activeIsSenior) {
    guidance = 'Priority 1: available lower berths are recommended to this eligible aged passenger. Priority 2: women are next for any remaining lower berths.';
  } else if (activeIsWoman && waitingSeniors) {
    guidance = 'Priority 1: assign seats to eligible aged passengers first. Priority 2: women are recommended remaining lower berths next.';
  } else if (activeIsWoman) {
    guidance = 'Priority 2: with senior passenger requests considered, available lower berths are recommended to women.';
  } else if (waitingSeniors || waitingWomen) {
    guidance = 'Lower berth preference order: 1) eligible aged passengers, 2) women. Men may still choose any available seat; remaining lower berths continue to be recommended by this order.';
  } else {
    guidance = 'Eligible aged passenger and women preferences have been considered. Everyone may choose any remaining available berth.';
  }

  if (maleLowerBerthSelections.length && (waitingSeniors || waitingWomen)) {
    guidance += ' The male passenger’s selection stays as selected; remaining lower berths keep the priority order above.';
  }

  return { waitingSeniors, waitingWomen, recommendLowerForActive, maleLowerBerthSelections, guidance };
}
