async function holdSeatBatch({ inventory, scope, seatNumbers, userId, holdId, expiresAt }) {
  const held = [];
  for (const seatNumber of seatNumbers) {
    const seat = await inventory.findOneAndUpdate(
      { ...scope, seatNumber, status: 'AVAILABLE' },
      { $set: { status: 'HELD', holdBy: userId, holdId, holdExpiresAt: expiresAt } },
      { new: true }
    );
    if (!seat) {
      if (held.length) await inventory.updateMany(
        { _id: { $in: held.map(item => item._id) }, holdId, status: 'HELD' },
        { $set: { status: 'AVAILABLE' }, $unset: { holdBy: 1, holdId: 1, holdExpiresAt: 1 } }
      );
      return { success: false, seatNumber };
    }
    held.push(seat);
  }
  return { success: true, held };
}

module.exports = { holdSeatBatch };
