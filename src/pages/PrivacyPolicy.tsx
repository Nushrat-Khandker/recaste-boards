import React from "react";
import Header from "@/components/Header";
import { Shield, Lock, MapPin, EyeOff, Database, Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl flex-grow">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground mt-1">
                For <strong>Noor – Sunset to Sunset Day View</strong> & <strong>Recaste</strong> Applications
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Effective Date: October 15, 2026 &bull; Last Updated: October 29, 2026
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 bg-card border rounded-2xl p-6 md:p-10 shadow-sm">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <Shield className="h-5 w-5 text-primary" />
              1. Introduction & Overview
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              This Privacy Policy applies to the <strong>Noor – Sunset to Sunset Day View</strong> mobile application
              (package: <code>com.example.myapplication</code> / <code>com.noor.dayview</code>) and associated services
              provided by <strong>Recaste</strong> (<a href="https://recaste.com" className="text-primary hover:underline">recaste.com</a>).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We respect your privacy and are committed to protecting your personal information. Our fundamental philosophy is
              <strong> privacy by design</strong>: all calculations and personal organization data stay strictly on your device.
              We do not sell, rent, monetize, or track your personal information.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              2. Location Data Collection and Usage
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The application requests access to your device's location (<code>ACCESS_FINE_LOCATION</code> and <code>ACCESS_COARSE_LOCATION</code>).
            </p>
            <div className="bg-muted/50 rounded-xl p-4 border space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Why Location Data Is Used:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>To calculate precise solar ephemeris, including exact local sunset, sunrise, civil twilight, nautical twilight, and astronomical dusk times.</li>
                <li>To compute accurate astronomical moon phases, illumination percentages, and lunar horizon positions.</li>
                <li>To calculate accurate Islamic prayer times (Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha) based on your geographic coordinates.</li>
              </ul>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-foreground">
              <strong>Important Notice on Location Privacy:</strong> All celestial and prayer calculations are performed <strong>100% locally on your device</strong> using on-device astronomical algorithms and local calculation engines. Your location coordinates are <strong>never transmitted to external servers, never shared with third parties, and never logged or stored off-device</strong>.
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <Database className="h-5 w-5 text-primary" />
              3. Local User Data & Events Storage
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              When you create timeline tasks, schedule events, add notes, or configure custom block reminders in the app:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>This data is stored entirely in an encrypted local database (Android Room / SQLite) on your physical device.</li>
              <li>We do not sync, upload, read, or maintain access to your personal schedule, tasks, or notes on any cloud servers.</li>
              <li>You retain full ownership and complete control of your data at all times.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <EyeOff className="h-5 w-5 text-primary" />
              4. Third-Party Services & Data Sharing
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We do <strong>not</strong> sell, lease, trade, or share your data with advertisers, data brokers, or third-party marketing entities.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The application uses standard platform libraries provided by Google Play Services for application delivery, updates, and core runtime capabilities.
              No third-party analytics trackers (such as advertising SDKs or behavioral telemetry) that identify individuals are bundled with this application.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <Lock className="h-5 w-5 text-primary" />
              5. Data Retention & User Deletion Rights
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Because all data resides exclusively on your local device:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>In-App Deletion:</strong> You can delete any task, note, or event at any time directly through the app interface.</li>
              <li><strong>Complete Erasure:</strong> You can wipe all stored data instantly by clearing the app storage in your Android device settings (<em>Settings &gt; Apps &gt; Noor &gt; Storage &gt; Clear Storage</em>) or by uninstalling the application.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              6. Children's Privacy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Our application does not knowingly collect, store, or solicit personal information from children under the age of 13 (or under 16 in the European Union). Since the application does not transmit personal data, it fully complies with the Children's Online Privacy Protection Act (COPPA) and international child privacy regulations.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              7. Security
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security practices. By eliminating external data transmission for core features and maintaining data isolation within Android's sandboxed application container, your information remains protected from unauthorized external access.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              8. Changes to This Privacy Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect product enhancements or regulatory requirements. Any modifications will be posted to this page (<a href="https://recaste.com/t0/privacy" className="text-primary hover:underline">https://recaste.com/t0/privacy</a>) with an updated revision date.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 border-t pt-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
              <Mail className="h-5 w-5 text-primary" />
              9. Contact Us
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-muted/40 rounded-xl p-4 border text-sm space-y-1">
              <p><strong>Entity:</strong> Recaste</p>
              <p><strong>Website:</strong> <a href="https://recaste.com" className="text-primary hover:underline">https://recaste.com</a></p>
              <p><strong>Privacy Contact:</strong> <a href="mailto:privacy@recaste.com" className="text-primary hover:underline">privacy@recaste.com</a></p>
              <p><strong>Support:</strong> <a href="mailto:support@recaste.com" className="text-primary hover:underline">support@recaste.com</a></p>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t py-6 bg-card/50 text-center text-xs text-muted-foreground mt-12">
        <div className="container mx-auto px-4">
          &copy; {new Date().getFullYear()} Recaste. All rights reserved. &bull; <Link to="/t0/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
