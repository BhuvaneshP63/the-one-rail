export function getLowerBerthPriority({ passengers, selectedSeats, coachSeats, activePassengerIndex, seniorCitizenAge = 60 }) {
  const waitingSeniors = passengers.some((passenger, index) => passenger.gender === 'Female' && Number(passenger.age) >= seniorCitizenAge && !Number.isInteger(selectedSeats[index]));
  const waitingWomen = passengers.some((passenger, index) => passenger.gender === 'Female' && Number(passenger.age) < seniorCitizenAge && !Number.isInteger(selectedSeats[index]));
  const activePassenger = passengers[activePassengerIndex] || {};
  const activeIsSenior = activePassenger.gender === 'Female' && Number(activePassenger.age) >= seniorCitizenAge;
  const activeIsWoman = activePassenger.gender === 'Female';
  const recommendLowerForActive = activeIsSenior || (!waitingSeniors && activeIsWoman);

  let guidance;
  if (activeIsSenior) {
    guidance = 'Priority 1: available lower berths are recommended to this eligible aged woman. Other women are next for any remaining lower berths.';
  } else if (activeIsWoman && waitingSeniors) {
    guidance = 'Priority 1: eligible aged women are recommended lower berths first. Other women are next for remaining lower berths.';
  } else if (activeIsWoman) {
    guidance = 'Eligible aged women have priority. Available lower berths are recommended to other women next.';
  } else if (waitingSeniors || waitingWomen) {
    guidance = 'Lower berths are unavailable to male passengers. Eligible aged women have recommendation priority, followed by other women.';
  } else {
    guidance = activePassenger.gender === 'Male' ? 'Lower berths are unavailable to male passengers. Other available berth types remain selectable.' : 'Lower berths are available to female passengers. All other available berths can also be selected.';
  }

  return { waitingSeniors, waitingWomen, recommendLowerForActive, guidance };
}
