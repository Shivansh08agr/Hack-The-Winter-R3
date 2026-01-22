import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './Payment.module.scss';
import { simulateDelay, simulatePayment } from '../../data/mockData';
import { errorToast, successToast, warningToast } from '../../lib/toast';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get booking data from navigation state
  const { seat, section, event } = location.state || {};
  
  // Timer state (2 minutes = 120 seconds)
  const [timeLeft, setTimeLeft] = useState(120);
  const [isExpired, setIsExpired] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null, 'success', 'failed'

  // Redirect if no booking data
  useEffect(() => {
    if (!seat || !section || !event) {
      navigate('/');
    }
  }, [seat, section, event, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || paymentStatus === 'success') {
      if (timeLeft <= 0) {
        setIsExpired(true);
        errorToast('Seat reservation expired!');
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, paymentStatus]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer class based on time left
  const getTimerClass = () => {
    if (timeLeft <= 30) return `${styles.timer} ${styles.critical}`;
    if (timeLeft <= 60) return `${styles.timer} ${styles.warning}`;
    return styles.timer;
  };

  // Handle payment
  const handlePayment = async () => {
    if (isExpired || isProcessing) return;

    setIsProcessing(true);
    
    // Simulate payment processing
    await simulateDelay(1500 + Math.random() * 1000);

    const isSuccess = simulatePayment();

    if (isSuccess) {
      setPaymentStatus('success');
      successToast('Payment successful!');
    } else {
      setPaymentStatus('failed');
      errorToast('Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setPaymentStatus(null);
  };

  // Handle back to seat selection
  const handleBackToSeats = () => {
    navigate('/');
  };

  // If no data, show nothing (will redirect)
  if (!seat || !section || !event) {
    return null;
  }

  // Success Screen
  if (paymentStatus === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1>Booking Confirmed!</h1>
          <p className={styles.confirmationText}>
            Your seat has been successfully booked.
          </p>
          
          <div className={styles.ticketDetails}>
            <div className={styles.ticketHeader}>
              <span className={styles.ticketLabel}>E-TICKET</span>
              <span className={styles.ticketId}>#{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
            </div>
            
            <div className={styles.ticketBody}>
              <h2>{event.eventName}</h2>
              <p className={styles.venue}>{event.venue}</p>
              <p className={styles.datetime}>
                {new Date(event.date).toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} • {event.time}
              </p>
              
              <div className={styles.seatInfo}>
                <div className={styles.infoBox}>
                  <span className={styles.label}>Section</span>
                  <span className={styles.value}>{section.sectionName}</span>
                </div>
                <div className={styles.infoBox}>
                  <span className={styles.label}>Seat</span>
                  <span className={styles.value}>{seat.seatId}</span>
                </div>
                <div className={styles.infoBox}>
                  <span className={styles.label}>Price</span>
                  <span className={styles.value}>{event.currency}{section.price.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <button className={styles.doneButton} onClick={handleBackToSeats}>
            Book Another Seat
          </button>
        </div>
      </div>
    );
  }

  // Payment Screen
  return (
    <div className={styles.container}>
      <div className={styles.paymentCard}>
        {/* Timer */}
        <div className={getTimerClass()}>
          <span className={styles.timerLabel}>Time remaining</span>
          <span className={styles.timerValue}>{formatTime(timeLeft)}</span>
        </div>

        {/* Expired Message */}
        {isExpired && (
          <div className={styles.expiredMessage}>
            <span className={styles.expiredIcon}>⏰</span>
            <h2>Seat Reservation Expired</h2>
            <p>Your seat has been released. Please select a new seat.</p>
            <button className={styles.backButton} onClick={handleBackToSeats}>
              Back to Seat Selection
            </button>
          </div>
        )}

        {/* Payment Content */}
        {!isExpired && (
          <>
            <h1>Complete Your Booking</h1>

            {/* Booking Summary */}
            <div className={styles.summary}>
              <h3>Booking Summary</h3>
              
              <div className={styles.eventInfo}>
                <p className={styles.eventName}>{event.eventName}</p>
                <p className={styles.eventVenue}>{event.venue}</p>
                <p className={styles.eventDate}>
                  {new Date(event.date).toLocaleDateString('en-IN', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })} • {event.time}
                </p>
              </div>

              <div className={styles.seatDetails}>
                <div className={styles.detail}>
                  <span>Section</span>
                  <span>{section.sectionName}</span>
                </div>
                <div className={styles.detail}>
                  <span>Seat Number</span>
                  <span>{seat.seatId}</span>
                </div>
                <div className={`${styles.detail} ${styles.total}`}>
                  <span>Total Amount</span>
                  <span>{event.currency}{section.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Failed Message */}
            {paymentStatus === 'failed' && (
              <div className={styles.failedMessage}>
                <p>Payment failed. Please try again.</p>
              </div>
            )}

            {/* Payment Button */}
            <button
              className={styles.payButton}
              onClick={paymentStatus === 'failed' ? handleRetry : handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className={styles.buttonSpinner}></span>
                  Processing...
                </>
              ) : paymentStatus === 'failed' ? (
                'Retry Payment'
              ) : (
                `Pay ${event.currency}${section.price.toLocaleString()}`
              )}
            </button>

            <button className={styles.cancelButton} onClick={handleBackToSeats}>
              Cancel Booking
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Payment;
