import { Link } from "react-router-dom";
import { FAQS } from "@/content/faqs";

const preview = FAQS.slice(0, 4);

const FAQSection = () => {
  return (
    <section id="faq" className="scroll-mt-20 px-6 py-28" style={{ backgroundColor: "#F8F1E6" }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[#8B7355]">FAQ</p>
          <h2 className="mb-4 font-serif text-4xl tracking-tight text-[#3D3428] md:text-5xl">
            Common questions
          </h2>
          <p className="text-base text-[#6B5D4D]">The same answers are on the FAQ page, with room to read them in full.</p>
        </div>
        <div className="space-y-6">
          {preview.map((faq) => (
            <section key={faq.question} className="rounded-xl border border-[#E8DCC8] bg-white/50 px-6 py-5">
              <h3 className="text-base font-medium text-[#3D3428]">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B5D4D]">{faq.answer}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link to="/faq" className="text-[#3D3428] underline decoration-[#D2B887] underline-offset-4">
            Read every question
          </Link>
        </p>
      </div>
    </section>
  );
};

export default FAQSection;
