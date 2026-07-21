import type { Metadata } from "next";
import { PolicyLayout } from "@/components/store/policy-page";
import { getSettings } from "@/lib/queries";
import { SETTINGS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Azhagu Thinpandam collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
};

// Grievance Officer — update the name here if the registered proprietor differs.
const GRIEVANCE_OFFICER = "Saravanan";

export default async function PrivacyPolicyPage() {
  const settings = await getSettings();
  const email = settings[SETTINGS.STORE_EMAIL] || "sales@azhaguthinpandam.com";
  const phone = settings[SETTINGS.STORE_PHONE] || "93440 22162";
  const address =
    settings[SETTINGS.STORE_ADDRESS] ||
    "111-1k-1A, Dwarakamayi, Polpettai, State Bank Colony, Tuticorin-628001";

  return (
    <PolicyLayout title="Privacy Policy" updated="21 July 2026">
      <h2>Introduction</h2>
      <p>
        This Privacy Policy describes how Azhagu Thinpandam and its affiliates (collectively
        &ldquo;Azhagu Thinpandam, we, our, us&rdquo;) collect, use, share, protect or otherwise
        process your information/personal data through our website{" "}
        <a href="https://azhaguthinpandam.com">https://azhaguthinpandam.com</a> (hereinafter referred
        to as Platform). Please note that you may be able to browse certain sections of the Platform
        without registering with us. We do not offer any product/service under this Platform outside
        India and your personal data will primarily be stored and processed in India. By visiting
        this Platform, providing your information or availing any product/service offered on the
        Platform, you expressly agree to be bound by the terms and conditions of this Privacy Policy,
        the Terms of Use and the applicable service/product terms and conditions, and agree to be
        governed by the laws of India including but not limited to the laws applicable to data
        protection and privacy. If you do not agree please do not use or access our Platform.
      </p>

      <h2>Collection</h2>
      <p>
        We collect your personal data when you use our Platform, services or otherwise interact with
        us during the course of our relationship and related information provided from time to time.
        Some of the information that we may collect includes but is not limited to personal
        data/information provided to us during sign-up/registering or using our Platform such as
        name, date of birth, address, telephone/mobile number, email ID and/or any such information
        shared as proof of identity or address. Some of the sensitive personal data may be collected
        with your consent, such as your bank account or credit or debit card or other payment
        instrument information etc, all of the above being in accordance with applicable law(s). You
        always have the option to not provide information, by choosing not to use a particular
        service or feature on the Platform. We may track your behaviour, preferences, and other
        information that you choose to provide on our Platform. This information is compiled and
        analysed on an aggregated basis. We will also collect your information related to your
        transactions on Platform and such third-party business partner platforms. When such a
        third-party business partner collects your personal data directly from you, you will be
        governed by their privacy policies. If you receive an email or a call from a
        person/association claiming to be Azhagu Thinpandam seeking any personal data like
        debit/credit card PIN, net-banking or mobile banking password, we request you to never
        provide such information. If you have already revealed such information, report it immediately
        to an appropriate law enforcement agency.
      </p>

      <h2>Usage</h2>
      <p>
        We use personal data to provide the services you request. To the extent we use your personal
        data to market to you, we will provide you the ability to opt-out of such uses. We use your
        personal data to assist sellers and business partners in handling and fulfilling orders;
        enhancing customer experience; to resolve disputes; troubleshoot problems; inform you about
        online and offline offers, products, services, and updates; customise your experience; detect
        and protect us against error, fraud and other criminal activity; enforce our terms and
        conditions; conduct marketing research, analysis and surveys; and as otherwise described to
        you at the time of collection of information.
      </p>

      <h2>Sharing</h2>
      <p>
        We may share your personal data internally within our group entities, our other corporate
        entities, and affiliates to provide you access to the services and products offered by them.
        We may disclose personal data to third parties such as sellers, business partners, third
        party service providers including logistics partners, prepaid payment instrument issuers,
        third-party reward programs and other payment opted by you. These disclosures may be required
        for us to provide you access to our services and products, to comply with our legal
        obligations, to enforce our user agreement, to facilitate our marketing and advertising
        activities, and to prevent, detect, mitigate, and investigate fraudulent or illegal
        activities related to our services. We may disclose personal and sensitive personal data to
        government agencies or other authorised law enforcement agencies if required to do so by law
        or in the good faith belief that such disclosure is reasonably necessary.
      </p>

      <h2>Security Precautions</h2>
      <p>
        To protect your personal data from unauthorised access or disclosure, loss or misuse we adopt
        reasonable security practices and procedures. However, the transmission of information is not
        completely secure for reasons beyond our control. By using the Platform, the users accept the
        security implications of data transmission over the internet and the World Wide Web which
        cannot always be guaranteed as completely secure, and therefore, there would always remain
        certain inherent risks regarding use of the Platform. Users are responsible for ensuring the
        protection of login and password records for their account.
      </p>

      <h2>Data Deletion and Retention</h2>
      <p>
        You have an option to delete your account by visiting your profile and settings on our
        Platform — this action would result in you losing all information related to your account.
        You may also write to us at the contact information provided below to assist you with these
        requests. We may, in event of any pending grievance, claims, pending shipments or any other
        services, refuse or delay deletion of the account. We retain your personal data for a period
        no longer than is required for the purpose for which it was collected or as required under any
        applicable law. We may retain data related to you if we believe it may be necessary to
        prevent fraud or future abuse or for other legitimate purposes.
      </p>

      <h2>Your Rights</h2>
      <p>
        You may access, rectify, and update your personal data directly through the functionalities
        provided on the Platform.
      </p>

      <h2>Consent</h2>
      <p>
        By visiting our Platform or by providing your information, you consent to the collection,
        use, storage, disclosure and otherwise processing of your information on the Platform in
        accordance with this Privacy Policy. You, while providing your personal data over the
        Platform, consent to us contacting you through SMS, instant messaging apps, call and/or
        e-mail for the purposes specified in this Privacy Policy. You have an option to withdraw your
        consent by writing to the Grievance Officer at the contact information provided below, with
        the subject line &ldquo;Withdrawal of consent for processing personal data&rdquo;. Please note
        that your withdrawal of consent will not be retrospective.
      </p>

      <h2>Changes to this Privacy Policy</h2>
      <p>
        Please check our Privacy Policy periodically for changes. We may update this Privacy Policy to
        reflect changes to our information practices. We may alert/notify you about significant
        changes to the Privacy Policy, in the manner as may be required under applicable laws.
      </p>

      <h2>Grievance Officer</h2>
      <ul>
        <li>
          <strong>Name:</strong> {GRIEVANCE_OFFICER}
        </li>
        <li>
          <strong>Designation:</strong> Grievance Officer, Azhagu Thinpandam
        </li>
        <li>
          <strong>Address:</strong> Azhagu Thinpandam, {address}
        </li>
        <li>
          <strong>Contact us:</strong> <a href={`mailto:${email}`}>{email}</a>
        </li>
        <li>
          <strong>Phone:</strong> {phone} · Time: Monday – Saturday (9:00 – 18:00)
        </li>
      </ul>
    </PolicyLayout>
  );
}
