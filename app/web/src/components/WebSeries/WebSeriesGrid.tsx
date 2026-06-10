// @ts-nocheck
import Image from "next/image";

const WebSeriesGrid = () => {
  const images = [
    {
      id: 1,
      src: "../../Images/movieimg.svg",
      bannerImg: "../../images/SingleWebSeriesDataImg.svg",
      title: "Teri Baaton Mein Aisa Uljha Jiya",
      year: "2024",
      genres: "Indian Drama, Movies, Funny Movies",
    },
    {
      id: 2,
      src: "../../Images/movieimg.svg",
      bannerImg: "../../images/SingleWebSeriesDataImg.svg",
      title: "Sample Title 2",
      year: "2023",
      genres: "Comedy, Adventure",
    },

    {
      id: 3,
      src: "../../Images/movieimg.svg",
      bannerImg: "../../images/SingleWebSeriesDataImg.svg",
      title: "Sample Title 3",
      year: "2022",
      genres: "Drama, Thriller",
    },
    {
      id: 4,
      src: "../../Images/movieimg.svg",
      bannerImg: "../../images/SingleWebSeriesDataImg.svg",
      title: "Sample Title 3",
      year: "2022",
      genres: "Drama, Thriller",
    },
    {
      id: 5,
      src: "../../Images/movieimg.svg",
      bannerImg: "../../images/SingleWebSeriesDataImg.svg",
      title: "Sample Title 3",
      year: "2022",
      genres: "Drama, Thriller",
    },
    {
      id: 6,
      src: "../../Images/movieimg.svg",
      bannerImg: "../../images/SingleWebSeriesDataImg.svg",
      title: "Sample Title 3",
      year: "2022",
      genres: "Drama, Thriller",
    },
    {
      id: 7,
      src: "../../Images/movieimg.svg",
      bannerImg: "../../images/SingleWebSeriesDataImg.svg",
      title: "Sample Title 3",
      year: "2022",
      genres: "Drama, Thriller",
    },
    {
      id: 8,
      src: "../../Images/movieimg.svg",
      bannerImg: "../../images/SingleWebSeriesDataImg.svg",
      title: "Sample Title 3",
      year: "2022",
      genres: "Drama, Thriller",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-20 mt-5 mb-5 py-4">
      <div className="flex flex-wrap -mx-3 gap-y-4">
        {images?.map((image) => (
          <div key={image?.id} className="w-1/2 px-3 md:w-1/4 md:px-3">
            <div className="image-card relative">
              {/* Image */}
              <Image
                src={image?.src}
                alt={image?.title}
                className="max-w-full h-auto rounded"
                width={300}
                height={450}
                style={{ width: "100%", height: "auto" }}
              />
              <div className="overlay p-3 text-white flex flex-col justify-between">
                <div>
                  <Image
                    src={image?.bannerImg}
                    alt={image?.title}
                    className=" rounded"
                    width={300}
                    height={150}
                    style={{ width: "100%", height: "auto" }}
                  />
                  <h5 className="font-bold mt-3">{image?.title}</h5>
                  <span>({image?.year})</span>
                </div>
                <div>
                  <h6>Cast</h6>
                  <p className="small">
                    Lorem ipsum dolor sit amet consectetur adipiscing elit.
                  </p>
                  <h6>Genres</h6>
                  <p className="small">{image?.genres}</p>
                </div>
                <button className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-[#fff000] text-black hover:bg-[#f4e600] font-bold mt-2">
                  Our Work &rarr;
                </button>
              </div>
              {/* Overlay */}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap -mx-3 mt-5">
        <center>
          <button className="inline-flex items-center justify-center rounded-md border border-transparent font-medium transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 border-black bg-black text-white hover:bg-neutral-800">View More</button>
        </center>
      </div>
    </div>
  );
};

export default WebSeriesGrid;
