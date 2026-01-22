import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Booking.module.scss';
import { seatLayout, eventData, simulateDelay, simulateBookingAttempt } from '../../data/mockData';
import { errorToast, successToast, infoToast } from '../../lib/toast';

const Booking = () => {
  const navigate = useNavigate();
  const [seats, setSeats] = useState(seatLayout);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSeatId, setLoadingSeatId] = useState(null);

  // Handle individual seat click
  const handleSeatClick = async (seat, section) => {
    if (seat.status !== 'AVAILABLE' || isLoading) return;

    setIsLoading(true);
    setLoadingSeatId(seat.seatId);

    // Simulate backend check (300-500ms)
    await simulateDelay(300 + Math.random() * 200);

    const isSuccess = simulateBookingAttempt();

    if (isSuccess) {
      successToast(`Seat ${seat.seatId} selected!`);
      setSelectedSeat(seat);
      setSelectedSection(section);
      
      // Navigate to payment with seat info
      navigate('/payment', {
        state: {
          seat: seat,
          section: section,
          event: eventData,
        },
      });
    } else {
      errorToast('Seat was just taken by another user!');
      // Update seat status to show it's now taken
      updateSeatStatus(seat.seatId, 'BOOKED');
    }

    setIsLoading(false);
    setLoadingSeatId(null);
  };

  // Handle section-based booking (auto-assign)
  const handleSectionBook = async (section) => {
    if (isLoading) return;

    // Find all available seats in this section
    const availableSeats = [];
    section.rows.forEach((row) => {
      row.forEach((seat) => {
        if (seat.status === 'AVAILABLE') {
          availableSeats.push(seat);
        }
      });
    });

    if (availableSeats.length === 0) {
      errorToast('No seats available in this section');
      return;
    }

    // Randomly pick one
    const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
    
    setIsLoading(true);
    setLoadingSeatId(randomSeat.seatId);
    infoToast(`Checking seat ${randomSeat.seatId}...`);

    await simulateDelay(300 + Math.random() * 200);

    const isSuccess = simulateBookingAttempt();

    if (isSuccess) {
      successToast(`Seat ${randomSeat.seatId} assigned!`);
      navigate('/payment', {
        state: {
          seat: randomSeat,
          section: section,
          event: eventData,
        },
      });
    } else {
      errorToast('Seat was just taken by another user!');
      updateSeatStatus(randomSeat.seatId, 'BOOKED');
    }

    setIsLoading(false);
    setLoadingSeatId(null);
  };

  // Update seat status in state
  const updateSeatStatus = (seatId, newStatus) => {
    setSeats((prevSeats) => {
      const newSeats = { ...prevSeats };
      newSeats.sections = newSeats.sections.map((section) => ({
        ...section,
        rows: section.rows.map((row) =>
          row.map((seat) =>
            seat.seatId === seatId ? { ...seat, status: newStatus } : seat
          )
        ),
      }));
      return newSeats;
    });
  };

  // Get seat class based on status
  const getSeatClass = (seat) => {
    let classes = styles.seat;
    if (seat.status === 'BOOKED') classes += ` ${styles.booked}`;
    if (seat.status === 'HOLD') classes += ` ${styles.hold}`;
    if (seat.status === 'AVAILABLE') classes += ` ${styles.available}`;
    if (loadingSeatId === seat.seatId) classes += ` ${styles.loading}`;
    return classes;
  };

  return (
    <div className={styles.container}>
      {/* Event Header */}
      <div className={styles.eventHeader}>
        <h1>{eventData.eventName}</h1>
        <div className={styles.eventDetails}>
          <span>{eventData.venue}</span>
          <span className={styles.divider}>|</span>
          <span>{new Date(eventData.date).toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
          <span className={styles.divider}>|</span>
          <span>{eventData.time}</span>
        </div>
      </div>

      {/* Stage */}
      <div className={styles.stage}>
        <span>STAGE</span>
      </div>

      {/* Seat Layout */}
      <div className={styles.seatLayout}>
        {seats.sections.map((section) => (
          <div key={section.sectionId} className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionInfo}>
                <h3>{section.sectionName}</h3>
                <span className={styles.price}>
                  {eventData.currency}{section.price.toLocaleString()}
                </span>
              </div>
              <button
                className={styles.quickBook}
                onClick={() => handleSectionBook(section)}
                disabled={isLoading}
              >
                Quick Book
              </button>
            </div>
            
            <div className={styles.rows}>
              {section.rows.map((row, rowIndex) => (
                <div key={rowIndex} className={styles.row}>
                  <span className={styles.rowLabel}>R{rowIndex + 1}</span>
                  <div className={styles.seats}>
                    {row.map((seat) => (
                      <div
                        key={seat.seatId}
                        className={getSeatClass(seat)}
                        onClick={() => handleSeatClick(seat, section)}
                        title={`${seat.seatId} - ${seat.status}`}
                      >
                        {loadingSeatId === seat.seatId ? (
                          <div className={styles.spinner}></div>
                        ) : seat.status === 'HOLD' ? (
                          <span className={styles.lockIcon}>🔒</span>
                        ) : seat.status === 'BOOKED' ? (
                          <span className={styles.bookedIcon}>✕</span>
                        ) : (
                          <span className={styles.seatNumber}>
                            {seat.seatId.split('-')[1]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBox} ${styles.available}`}></div>
          <span>Available</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBox} ${styles.hold}`}></div>
          <span>On Hold</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendBox} ${styles.booked}`}></div>
          <span>Booked</span>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingSpinner}></div>
            <p>Checking availability...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
