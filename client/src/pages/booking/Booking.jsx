import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Booking.module.scss';
import { eventData, seatLayout, transformSeatsData } from '../../data/mockData';
import { errorToast, successToast, infoToast } from '../../lib/toast';
import { useSeats } from '../../api';

// User ID - in production, get from auth
// Using a fixed ID for demo purposes
const USER_ID = "4";

const Booking = () => {
  const navigate = useNavigate();
  const { seatsLoading, bookingLoading, getSeats, bookSeat } = useSeats();
  
  const [seats, setSeats] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSeatId, setLoadingSeatId] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch seats on mount
  useEffect(() => {
    fetchSeats();
  }, []);

  const fetchSeats = () => {
    getSeats((data, error) => {
      if (error) {
        console.error("[Booking] Error fetching seats:", error);
        // Fallback to mock data
        setSeats(seatLayout);
        setInitialLoading(false);
        return;
      }

      
      // Transform API response to UI format
      const transformedData = transformSeatsData(data.sections);
      
      setSeats(transformedData);
      setInitialLoading(false);
    });
  };

  // Handle individual seat click
  const handleSeatClick = async (seat, section) => {
    if (seat.status !== 'AVAILABLE' || isLoading || bookingLoading) return;

    setIsLoading(true);
    setLoadingSeatId(seat.seatId);

    bookSeat(
      {
        seats: [{ seatId: seat.seatId, sectionId: section.sectionId }],
        userId: USER_ID,
      },
      (data, error) => {
        if (error) {
          console.error("[Booking] Book seat error:", error);
          // Update seat status to show it's now taken
          if (error?.error === "SEAT_ALREADY_TAKEN") {
            updateSeatStatus(seat.seatId, 'BOOKED');
          }
          setIsLoading(false);
          setLoadingSeatId(null);
          return;
        }

        successToast(`Seat ${seat.seatId} reserved!`);
        setSelectedSeat(seat);
        setSelectedSection(section);

        // Navigate to payment with booking info
        navigate('/payment', {
          state: {
            seats: data.seats || [{ seatId: seat.seatId, sectionId: section.sectionId }],
            section: section,
            bookingId: data.bookingId,
            expiresIn: data.expiresIn,
            userId: USER_ID,
            count: data.count || 1,
          },
        });

        setIsLoading(false);
        setLoadingSeatId(null);
      }
    );
  };

  // Handle section-based booking (auto-assign)
  const handleSectionBook = async (section) => {
    if (isLoading || bookingLoading) return;

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
    infoToast(`Reserving seat ${randomSeat.seatId}...`);

    bookSeat(
      {
        seats: [{ seatId: randomSeat.seatId, sectionId: section.sectionId }],
        userId: USER_ID,
      },
      (data, error) => {
        if (error) {
          console.error("[Booking] Quick book error:", error);
          if (error?.error === "SEAT_ALREADY_TAKEN") {
            updateSeatStatus(randomSeat.seatId, 'BOOKED');
          }
          setIsLoading(false);
          setLoadingSeatId(null);
          return;
        }

        successToast(`Seat ${randomSeat.seatId} reserved!`);
        
        navigate('/payment', {
          state: {
            seats: data.seats || [{ seatId: randomSeat.seatId, sectionId: section.sectionId }],
            section: section,
            bookingId: data.bookingId,
            expiresIn: data.expiresIn,
            userId: USER_ID,
            count: data.count || 1,
          },
        });

        setIsLoading(false);
        setLoadingSeatId(null);
      }
    );
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

  // Show loading state while fetching seats
  if (initialLoading || !seats) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingOverlay} style={{ position: 'relative', minHeight: '400px' }}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingSpinner}></div>
            <p>Loading seats...</p>
          </div>
        </div>
      </div>
    );
  }

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
                            {seat.seatId}
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
