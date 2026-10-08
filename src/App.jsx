import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bath,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CreditCard,
  Home,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  ParkingCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tv,
  Users,
  Wifi,
  X,
} from "lucide-react";

const photos = [
  { src: "/images/living-room.jpg", alt: "Imaz Homes living room" },
  { src: "/images/pool.jpg", alt: "Imaz Homes swimming pool" },
  { src: "/images/entry.jpg", alt: "Imaz Homes entry area" },
  { src: "/images/tv-room.jpg", alt: "Imaz Homes TV area" },
  { src: "/images/kitchen.jpg", alt: "Imaz Homes kitchen" },
  { src: "/images/open-plan.jpg", alt: "Imaz Homes open-plan living space" },
  { src: "/images/aroma.jpg", alt: "Imaz Homes welcome detail" },
];

const nightlyRate = 250000;
const cleaningFee = 0;
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(`${checkIn}T00:00:00`);
  const b = new Date(`${checkOut}T00:00:00`);
  return Math.max(0, Math.round((b - a) / 86400000));
}

function money(value) {
  return new Intl.NumberFormat("en-TZ").format(value);
}

function formatDate(value) {
  if (!value) return "Select date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function App() {
  const [mobileNav, setMobileNav] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [booking, setBooking] = useState({
    checkIn: "",
    checkOut: "",
    guests: 1,
    name: "",
    email: "",
    phone: "",
    paymentMethod: "mobile-money",
    mobileProvider: "M-Pesa",
    mobileNumber: "",
  });
  const [bookingResult, setBookingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const subtotal = nights * nightlyRate;
  const total = subtotal + cleaningFee;

  const minDate = new Date().toISOString().split("T")[0];

  const update = (key, value) =>
    setBooking((current) => ({ ...current, [key]: value }));

  const openBooking = () => {
    setError("");
    setBookingResult(null);
    setBookingStep(1);
    setBookingOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeBooking = () => {
    setBookingOpen(false);
    document.body.style.overflow = "";
  };

  useEffect(() => {
    if (!bookingOpen && !galleryOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setGalleryOpen(false);
        closeBooking();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bookingOpen, galleryOpen]);

  const goGallery = (direction) => {
    setGalleryIndex(
      (current) => (current + direction + photos.length) % photos.length,
    );
  };

  const validateDates = () => {
    if (!booking.checkIn || !booking.checkOut) {
      setError("Please choose both check-in and check-out dates.");
      return false;
    }
    if (nights < 1) {
      setError("Check-out must be after check-in.");
      return false;
    }
    if (booking.guests < 1 || booking.guests > 4) {
      setError("This apartment accommodates up to 4 guests.");
      return false;
    }
    return true;
  };

  const validateGuest = () => {
    if (
      !booking.name.trim() ||
      !booking.email.trim() ||
      !booking.phone.trim()
    ) {
      setError("Please complete your name, email and phone number.");
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(booking.email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const validatePayment = () => {
    if (
      booking.paymentMethod === "mobile-money" &&
      !booking.mobileNumber.trim()
    ) {
      setError("Enter the mobile-money number to receive the payment prompt.");
      return false;
    }
    return true;
  };

  const continueFromStep = () => {
    setError("");
    if (bookingStep === 1 && validateDates()) setBookingStep(2);
    else if (bookingStep === 2 && validateGuest()) setBookingStep(3);
  };

  async function submitBooking() {
    setError("");
    if (!validatePayment()) return;

    setLoading(true);
    try {
      const createResponse = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...booking,
          nights,
          nightlyRate,
          total,
        }),
      });

      const created = await createResponse.json();
      if (!createResponse.ok)
        throw new Error(created.message || "Could not create booking.");

      const paymentResponse = await fetch(`${API_BASE}/api/payments/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: created.booking.id,
          amount: total,
          method: booking.paymentMethod,
          provider: booking.mobileProvider,
          phone: booking.mobileNumber,
        }),
      });

      const payment = await paymentResponse.json();
      if (!paymentResponse.ok)
        throw new Error(payment.message || "Could not start payment.");

      setBookingResult({ booking: created.booking, payment });
      setBookingStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const amenities = [
    [Wifi, "Wi-Fi", "Fast internet"],
    [Sparkles, "Swimming Pool", "Private property pool"],
    [Home, "Fully Equipped Kitchen", "Cook like home"],
    [Tv, "Smart TV", "Entertainment"],
    [CircleUserRound, "Workspace", "Work comfortably"],
    [ParkingCircle, "Free Parking", "On-site parking"],
    [LockKeyhole, "Smart Lock", "Self check-in"],
  ];

  return (
    <div className="site">
      <header className="navbar">
        <a className="brand" href="#home" onClick={() => setMobileNav(false)}>
          <span className="brand-mark">⌂</span>
          <span>
            <strong>IMAZ</strong>
            <small>HOMES</small>
          </span>
        </a>

        <nav className={mobileNav ? "nav-links open" : "nav-links"}>
          <a href="#home" onClick={() => setMobileNav(false)}>
            Home
          </a>
          <a href="#apartment" onClick={() => setMobileNav(false)}>
            The Apartment
          </a>
          <a href="#amenities" onClick={() => setMobileNav(false)}>
            Amenities
          </a>
          <a href="#gallery" onClick={() => setMobileNav(false)}>
            Gallery
          </a>
          <a href="#location" onClick={() => setMobileNav(false)}>
            Location
          </a>
          <a href="#reviews" onClick={() => setMobileNav(false)}>
            Reviews
          </a>
        </nav>

        <button className="nav-book" onClick={openBooking}>
          Book Now <ArrowRight size={16} />
        </button>
        <button
          className="menu-btn"
          onClick={() => setMobileNav(!mobileNav)}
          aria-label={mobileNav ? "Close menu" : "Open menu"}
          aria-expanded={mobileNav}
        >
          {mobileNav ? <X /> : <Menu />}
        </button>
      </header>

      <main>
        <section id="home" className="hero">
          <img src="/images/living-room.jpg" alt="Imaz Homes living room" />
          <div className="hero-overlay" />
          <div className="hero-content">
            <p className="eyebrow light">IMAZ HOMES</p>
            <h1>
              Your Home
              <br />
              Away From Home
              <br />
              <em>in Dar es Salaam</em>
            </h1>
            <p className="hero-copy">
              Modern, stylish and fully furnished accommodation with the comfort
              you need for a relaxing short stay.
            </p>
            <button className="primary-btn" onClick={openBooking}>
              Book Your Stay <ArrowRight size={18} />
            </button>
          </div>
          <div className="rating-card">
            <strong>★ 5.0</strong>
            <span>10 reviews</span>
            <small>Airbnb Superhost</small>
          </div>

          <div className="search-panel">
            <div className="search-field">
              <CalendarDays />
              <div>
                <small>Check-in</small>
                <strong>{formatDate(booking.checkIn)}</strong>
              </div>
            </div>
            <div className="search-field">
              <CalendarDays />
              <div>
                <small>Check-out</small>
                <strong>{formatDate(booking.checkOut)}</strong>
              </div>
            </div>
            <div className="search-field">
              <Users />
              <div>
                <small>Guests</small>
                <strong>
                  {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
                </strong>
              </div>
              <ChevronDown size={16} />
            </div>
            <button className="search-btn" onClick={openBooking}>
              <Search size={17} /> Search
            </button>
          </div>
        </section>

        <section className="facts">
          <div>
            <BedDouble />
            <strong>2 Bedrooms</strong>
            <span>Comfortable & spacious</span>
          </div>
          <div>
            <BedDouble />
            <strong>2 Beds</strong>
            <span>Sleeps up to 4 guests</span>
          </div>
          <div>
            <Bath />
            <strong>2 Bathrooms</strong>
            <span>Modern & clean</span>
          </div>
          <div>
            <MapPin />
            <strong>Dar es Salaam</strong>
            <span>Prime location</span>
          </div>
        </section>

        <section id="apartment" className="about section">
          <div className="about-copy">
            <p className="eyebrow">ABOUT IMAZ HOMES</p>
            <h2>
              A Modern Apartment
              <br />
              Designed for Your Comfort
            </h2>
            <p>
              Enjoy the perfect blend of comfort, style and convenience in our
              beautifully furnished 2-bedroom apartment. Imaz Homes is designed
              for guests who want the ease of a real home while visiting Dar es
              Salaam.
            </p>
            <p className="script">Comfort. Style. Convenience.</p>
          </div>
          <img src="/images/pool.jpg" alt="Imaz Homes pool" />
        </section>

        <section id="amenities" className="section amenities">
          <p className="eyebrow">AMENITIES</p>
          <h2>Everything You Need for a Perfect Stay</h2>
          <div className="amenity-grid">
            {amenities.map(([Icon, title, text]) => (
              <div className="amenity" key={title}>
                <div className="amenity-icon">
                  <Icon size={24} />
                </div>
                <strong>{title}</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="gallery" className="section gallery">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GALLERY</p>
              <h2>Take a Look Inside</h2>
            </div>
            <button
              className="text-btn"
              onClick={() => {
                setGalleryIndex(0);
                setGalleryOpen(true);
              }}
            >
              View all photos <ArrowRight size={16} />
            </button>
          </div>
          <div className="gallery-grid">
            {photos.map((photo, index) => (
              <button
                className="photo-card"
                aria-label={`View ${photo.alt}`}
                key={photo.src}
                onClick={() => {
                  setGalleryIndex(index);
                  setGalleryOpen(true);
                }}
              >
                <img src={photo.src} alt={photo.alt} />
              </button>
            ))}
          </div>
        </section>

        <section id="location" className="location section">
          <div>
            <p className="eyebrow">LOCATION</p>
            <h2>Stay in Dar es Salaam</h2>
            <p>
              Imaz Homes gives you a comfortable base for exploring Dar es
              Salaam, relaxing by the pool, or handling a business trip.
            </p>
          </div>
          <div className="location-card">
            <MapPin size={28} />
            <strong>Dar es Salaam, Tanzania</strong>
            <span>Kijitonyama,Imaz homes.</span>
          </div>
        </section>

        <section id="reviews" className="reviews section">
          <p className="eyebrow">GUEST EXPERIENCE</p>
          <h2>5.0 ★ on Airbnb</h2>
          <p>Based on 10 reviews shown on the Airbnb listing.</p>
          <div className="review-strip">
            <span>Comfort</span>
            <span>Cleanliness</span>
            <span>Location</span>
            <span>Communication</span>
          </div>
        </section>

        <section className="cta">
          <div>
            <p className="eyebrow light">READY TO STAY?</p>
            <h2>Make yourself at home.</h2>
            <p>Book Imaz Homes for your next stay in Dar es Salaam.</p>
          </div>
          <button className="primary-btn" onClick={openBooking}>
            Book Now <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark">⌂</span>
          <span>
            <strong>IMAZ</strong>
            <small>HOMES</small>
          </span>
        </div>
        <div className="footer-meta">
          <span>Stay. Relax. Feel at Home.</span>
          <span>Dar es Salaam, Tanzania</span>
        </div>
      </footer>

      {galleryOpen && (
        <div
          className="modal gallery-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          onClick={() => setGalleryOpen(false)}
        >
          <button
            className="modal-close"
            aria-label="Close photo viewer"
            onClick={() => setGalleryOpen(false)}
          >
            <X />
          </button>
          <button
            className="gallery-arrow left"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              goGallery(-1);
            }}
          >
            <ChevronLeft />
          </button>
          <img
            src={photos[galleryIndex].src}
            alt={photos[galleryIndex].alt}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="gallery-arrow right"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              goGallery(1);
            }}
          >
            <ChevronRight />
          </button>
        </div>
      )}

      {bookingOpen && (
        <div
          className="modal booking-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Book your stay"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeBooking();
          }}
        >
          <div className="booking-modal">
            <button
              className="modal-close dark"
              aria-label="Close booking form"
              onClick={closeBooking}
            >
              <X />
            </button>

            {bookingStep < 4 && (
              <div className="booking-head">
                <div>
                  <p className="eyebrow">IMAZ HOMES</p>
                  <h2>Book your stay</h2>
                </div>
                <div className="steps">
                  <span className={bookingStep >= 1 ? "active" : ""}>1</span>
                  <span className={bookingStep >= 2 ? "active" : ""}>2</span>
                  <span className={bookingStep >= 3 ? "active" : ""}>3</span>
                </div>
              </div>
            )}

            {error && <div className="error-box">{error}</div>}

            {bookingStep === 1 && (
              <div className="form-step">
                <h3>Choose your dates</h3>
                <div className="form-grid">
                  <label>
                    Check-in
                    <input
                      type="date"
                      min={minDate}
                      value={booking.checkIn}
                      onChange={(e) => update("checkIn", e.target.value)}
                    />
                  </label>
                  <label>
                    Check-out
                    <input
                      type="date"
                      min={booking.checkIn || minDate}
                      value={booking.checkOut}
                      onChange={(e) => update("checkOut", e.target.value)}
                    />
                  </label>
                  <label>
                    Guests
                    <select
                      value={booking.guests}
                      onChange={(e) => update("guests", Number(e.target.value))}
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n} guest{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="price-preview">
                  <span>
                    {nightlyRate.toLocaleString()} TSh × {nights || 0} night
                    {nights === 1 ? "" : "s"}
                  </span>
                  <strong>{money(subtotal)} TSh</strong>
                </div>
                <button
                  className="primary-btn full"
                  type="button"
                  onClick={continueFromStep}
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            )}

            {bookingStep === 2 && (
              <div className="form-step">
                <h3>Guest details</h3>
                <div className="form-grid">
                  <label>
                    Full name
                    <input
                      placeholder="Your name"
                      value={booking.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={booking.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      placeholder="+255..."
                      value={booking.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </label>
                </div>
                <div className="secure-note">
                  <ShieldCheck /> Your booking details are sent securely to the
                  booking server.
                </div>
                <div className="button-row">
                  <button
                    className="secondary-btn"
                    onClick={() => setBookingStep(1)}
                  >
                    Back
                  </button>
                  <button className="primary-btn" onClick={continueFromStep}>
                    Continue <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {bookingStep === 3 && (
              <div className="form-step">
                <h3>Payment</h3>
                <div className="total-box">
                  <span>
                    Total for {nights} night{nights === 1 ? "" : "s"}
                  </span>
                  <strong>{money(total)} TSh</strong>
                </div>

                <div className="payment-options">
                  <button
                    className={
                      booking.paymentMethod === "mobile-money"
                        ? "payment-option selected"
                        : "payment-option"
                    }
                    onClick={() => update("paymentMethod", "mobile-money")}
                  >
                    <Smartphone />
                    <span>
                      <strong>Mobile Money</strong>
                      <small>M-Pesa, Airtel Money, Tigo Pesa</small>
                    </span>
                  </button>
                  <button
                    className={
                      booking.paymentMethod === "card"
                        ? "payment-option selected"
                        : "payment-option"
                    }
                    onClick={() => update("paymentMethod", "card")}
                  >
                    <CreditCard />
                    <span>
                      <strong>Card</strong>
                      <small>Payment gateway placeholder</small>
                    </span>
                  </button>
                </div>

                {booking.paymentMethod === "mobile-money" && (
                  <div className="form-grid">
                    <label>
                      Provider
                      <select
                        value={booking.mobileProvider}
                        onChange={(e) =>
                          update("mobileProvider", e.target.value)
                        }
                      >
                        <option>M-Pesa</option>
                        <option>Airtel Money</option>
                        <option>Tigo Pesa</option>
                      </select>
                    </label>
                    <label>
                      Mobile number
                      <input
                        placeholder="+255..."
                        value={booking.mobileNumber}
                        onChange={(e) => update("mobileNumber", e.target.value)}
                      />
                    </label>
                  </div>
                )}

                {booking.paymentMethod === "card" && (
                  <div className="secure-note">
                    <CreditCard /> Connect your preferred card gateway in{" "}
                    <code>/server/server.js</code> before accepting live card
                    payments.
                  </div>
                )}

                <div className="button-row">
                  <button
                    className="secondary-btn"
                    onClick={() => setBookingStep(2)}
                  >
                    Back
                  </button>
                  <button
                    className="primary-btn"
                    disabled={loading}
                    onClick={submitBooking}
                  >
                    {loading ? "Starting..." : "Confirm & Pay"}{" "}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {bookingStep === 4 && bookingResult && (
              <div className="success-step">
                <div className="success-icon">
                  <CheckCircle2 />
                </div>
                <p className="eyebrow">BOOKING CREATED</p>
                <h2>You're almost there!</h2>
                <p>
                  Booking <strong>{bookingResult.booking.id}</strong> has been
                  created.
                  {bookingResult.payment.status === "pending"
                    ? " A payment request is ready to be completed."
                    : " Payment was recorded."}
                </p>
                <div className="confirmation">
                  <div>
                    <span>Stay</span>
                    <strong>
                      {booking.checkIn} → {booking.checkOut}
                    </strong>
                  </div>
                  <div>
                    <span>Guests</span>
                    <strong>{booking.guests}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong>{money(total)} TSh</strong>
                  </div>
                  <div>
                    <span>Transaction</span>
                    <strong>{bookingResult.payment.transactionId}</strong>
                  </div>
                </div>
                <div className="secure-note">
                  <MessageCircle /> In a production setup, your payment provider
                  will send the mobile-money prompt to the supplied number.
                </div>
                <button
                  className="primary-btn full"
                  type="button"
                  onClick={closeBooking}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
