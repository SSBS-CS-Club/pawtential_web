import React from 'react';

function AnimalCard({ animal }) {
  return (
    <div className="animal-card">
      <h2>{animal.name}</h2>
      <p><strong>种类:</strong> {animal.species}</p>
      <p><strong>年龄:</strong> {animal.age} 岁</p>
      <p><strong>领养日期:</strong> {animal.adoptionDate}</p>
      <button className="adopt-button">领养我</button>
    </div>
  );
}

export default AnimalCard;