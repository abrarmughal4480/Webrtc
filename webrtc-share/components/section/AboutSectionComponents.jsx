import React from 'react';

export const AboutSection = () => {
  return (
    <section id="about" className="bg-amber-400 py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">About</h2>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-base md:text-lg">
            Videodesk is a powerful video communication platform designed to revolutionize 
            customer support and service delivery. We enable businesses to connect with 
            their customers through instant video links, making problem-solving faster, 
            more personal, and more effective than traditional methods.
          </p>
        </div>
      </div>
    </section>
  );
};
