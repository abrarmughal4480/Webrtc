import React, { Fragment } from 'react';


const Step = ({ number, title, description, index }) => {
  return (
    <div className="flex-1 p-4 md:p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-center mb-3 md:mb-4">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm md:text-base">
          {number}
        </div>
      </div>

      <p className="text-gray-600 text-center whitespace-pre text-sm md:text-base">{title.split("").map((cha,index) => (
        <Fragment key={index.toString()}>
          {
            cha == "|" ? <br /> : `${cha}`
          }
        </Fragment>
      ))}</p>
    </div>
  );
};

export const HowItWorksSection = () => {
  const steps = [
    {
      number: 1,
      title: "Enter your customer's | mobile number or email | and send a video link | instantly",
      description: ""
    },
    {
      number: 2,
      title: "View live video, take video | snapshots or image | screenshots",
      description: ""
    },
    {
      number: 3,
      title: "Share and send page | links to any colleague, |  any contractor  or | any system",
    }
  ];

  return (
    <section id="how-it-works" className="py-12 md:py-16 bg-amber-400">
      <div className="container mx-auto px-4 md:px-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center text-white">How it works</h2>

        <div className="relative">
          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-row gap-4 md:gap-6 lg:gap-2 relative z-10">
            {steps.map((step, index) => (
              <Step
                key={index}
                number={step.number}
                title={step.title}
                description={step.description}
                index={index}
              />
            ))}
          </div>

          {/* Connector line - only on large screens */}
          <div className="hidden lg:block absolute top-12 md:top-14 left-0 right-0 h-0.5 bg-gray-300 z-0">
            <div className="absolute -top-1 left-1/4 w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="absolute -top-1 left-2/4 w-2 h-2 rounded-full bg-gray-300"></div>
            <div className="absolute -top-1 left-3/4 w-2 h-2 rounded-full bg-gray-300"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
