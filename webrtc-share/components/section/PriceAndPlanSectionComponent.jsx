"use client"
import React from "react"
import { Check, Expand, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Fragment, useState } from "react"
import { TypeAnimation } from "react-type-animation"

export default function PriceAndPlan() {
  const [role, setRole] = useState("landlord");

  const plans = [
    {
      black: "Standard",
      price: "",
      description: "",
      subtitle: "No payment card needed",
      highlight: [],
      buttonText: "For getting started",
      buttonVariant: "default",
      features: [
        "Up to 15 free video links per user",
        "Capture 1 video (upto 30 seconds) on each live call",
        "Capture upto 3 image screenshots on each live call",
        "Save and retrieve up to 10 sent links in your live dashboard",
        "Store saved links in your dashboard for upto 14 days",
        "Send 1 direct shareble link to a third party for your saved videos/ images/ call notes for each call",
        "Label upto 2 of your saved videos or images in each video call",
        "Use Videodesk from any desktop/tablet to connect with any mobile device",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
      ],
    },
    {
      name: "Plus Account",
      price: "",
      description: "",
      subtitle: "Everything in Basic, and:",
      highlight: ["Basic,"],
      buttonText: "For small teams",
      buttonVariant: "default",
      features: [
        "Up to 60 free video links per user",
        "Capture up to 2 videos (upto 45 seconds) on each live call",
        "Capture upto 6 image screenshots on each live call",
        "Keep up to 20 sent links in your live dashboard",
        "Store saved links in your dashboard for upto 31 days",
        "Send up to 2 direct shareble links to third parties for your saved videos/ images/ call notes for each call",
        "Label upto 4 of your saved videos or images in each video call",
        "Use Videodesk from any desktop/tablet to connect with any mobile device",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
      ],
    },
    {
      name: "Professional",
      price: "",
      description: "",
      subtitle: "Everything in Plus, and:",
      highlight: ["Plus,"],
      buttonText: "For large teams",
      buttonVariant: "default",
      features: [
        "Unlimited links to send by text or email",
        "Capture up to 4 (each 60 seconds) videos on each live call",
        "Capture upto 10 image screenshots on each live call",
        "Keep upto 30 saved links in your dashboard",
        "Store saved links in your dashboard for up to 3 months",
        "Send up to 3 Direct Shareble links to a third party of your saved videos/ images/ call notes",
        "Add Unlimited labels for your saved videos or images",
        "Use Videodesk from any mobile to mobile device",
        "Make a professional impression, add a custom logo to your customer messages/joining links",
        "Export your saved links to anyone or any system",
        "Get insights and stats on user feedback",
        "-",
        "-",
      ],
    },
    {
      name: "Enterprise",
      price: "",
      description: "",
      subtitle: "Everything in Professional, and:",
      highlight: ["Professional,"],
      buttonText: "For large businesses",
      buttonVariant: "default",
      features: [
        "Dedicated Account Manager",
        "Unlimited recording time for videos in each call link",
        "Unlimited screenshot images in each call link",
        "Unlimited direct shareble links to third parties of your saved videos/ images/ call notes",
        "Custom designed live video/notes page",
        "Custom designed dashboard",
        "Unlimited storage of saved links in your dashboard",
        "Keep all saved links for up to 12 months",
        "Save and back up all data to your own servers (optional)",
        "1 x half day training event (online or at your place)",
        "Custom collaboration on bespoke technology solutions for your business (no consulting fees apply)",
        "Custom development",
        "Custom implementation",
        "Custom Contract",
      ],
    },
  ]

  return (
    <section
      className="w-full py-12 md:py-16 px-4"
      style={{
        background: "linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #C084FC 100%)",
      }}
      id="pricing"
    >
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">Plans</h2>
          <p className="text-white/90 text-base md:text-lg">Choose the plan that's right for you</p>
          {/* <div className="mt-3 md:mt-4 flex items-center justify-center flex-col">
            <p className="text-white/90 text-base md:text-lg mb-3 md:mb-4">Select an option:</p>
            <Select value={role} onValueChange={value => setRole(value)}>
              <SelectTrigger className="bg-amber-500 text-white flex items-center justify-center text-lg md:text-xl font-semibold outline-none border-none w-full max-w-xs">
                <SelectValue placeholder="Social Landlord" className="w-[180px]" />
              </SelectTrigger>
              <SelectContent className={'border-none bg-white'}>
                <SelectItem value="landlordd" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Automotive</SelectItem>
                <SelectItem value="residenc" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>NHS/Health Provider</SelectItem>
                <SelectItem value="landlord" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Social Landlord</SelectItem>
              </SelectContent>
            </Select>
          </div> */}


        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {plans.map((plan, index) => (
            <Card key={index} className="bg-white border-0 shadow-lg h-full flex flex-col gap-2 p-0">
              <CardHeader className="pb-3 md:pb-4 mt-3 md:mt-4 px-4 md:px-6">
                <div className="flex items-center gap-2">
                  {
                    plan.black &&
                    <CardTitle className="text-2xl md:text-3xl font-bold text-black">{plan.black}</CardTitle>
                  }
                  <CardTitle className="text-2xl md:text-3xl font-bold text-amber-400">
                    {plan.name}
                  </CardTitle>           
                </div>
                <p className="text-sm md:text-md font-semibold text-black mb-2">{plan.description}</p>
                {plan.subtitle && <p className="text-xs md:text-sm text-gray-600 font-normal">{plan.subtitle?.split(" ").map((word, wordIndex) => (
                  <Fragment key={wordIndex}>
                    {
                      plan.highlight.includes(word) ? <strong className="text-black font-bold"> {word}</strong> : <> {word}</>
                    }
                  </Fragment>
                ))}</p>}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col px-4 md:px-6 pb-4 md:pb-6">
                <Button className={`w-full mb-4 md:mb-6 bg-amber-400 hover:bg-amber-600 text-white font-medium py-2 rounded-md whitespace-nowrap overflow-hidden text-ellipsis ${
                  plan.name === "Plus Account" 
                    ? "px-1 md:px-3 text-xs md:text-sm" 
                    : "px-3 md:px-4 text-sm md:text-base"
                }`} onClick={() => window.open('mailto:Info@videodesk.co.uk', '_blank')}>
                  {plan.buttonText}
                </Button>

                <div className="space-y-2 md:space-y-3 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <React.Fragment key={featureIndex}>
                      {
                        feature == "-" ?
                          (
                            <div className="flex items-center gap-3 justify-center">
                              <span className="text-base md:text-lg font-medium text-amber-500 leading-relaxed ">{feature}</span>
                            </div>
                          )
                          :
                          (
                            <div className="flex items-start gap-2 md:gap-3">
                              <Check className="h-3 w-3 md:h-4 md:w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                              <span className="text-xs md:text-sm text-gray-700 leading-relaxed">{feature}</span>
                            </div>
                          )
                      }
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
