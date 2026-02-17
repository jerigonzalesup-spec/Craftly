package com.craftly.app.presentation.ui.adapters

import android.util.Log
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.craftly.app.R

class ImageCarouselAdapter(private val images: List<String>) :
    RecyclerView.Adapter<ImageCarouselAdapter.ImageViewHolder>() {

    private val TAG = "ImageCarouselAdapter"

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ImageViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_carousel_image, parent, false)
        return ImageViewHolder(view.findViewById(R.id.carouselImage))
    }

    override fun onBindViewHolder(holder: ImageViewHolder, position: Int) {
        val imageUrl = images[position]
        Log.d(TAG, "Binding image at position $position: $imageUrl")
        holder.bind(imageUrl)
    }

    override fun getItemCount(): Int = images.size

    class ImageViewHolder(private val imageView: ImageView) : RecyclerView.ViewHolder(imageView) {
        fun bind(imageUrl: String) {
            try {
                imageView.load(imageUrl) {
                    crossfade(true)
                    placeholder(R.drawable.ic_launcher_foreground)
                    error(R.drawable.ic_launcher_foreground)
                }
            } catch (e: Exception) {
                Log.e("ImageViewHolder", "Error loading image: ${e.message}")
                imageView.setImageResource(R.drawable.ic_launcher_foreground)
            }
        }
    }
}
