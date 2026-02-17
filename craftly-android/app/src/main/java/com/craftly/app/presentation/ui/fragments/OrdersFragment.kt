package com.craftly.app.presentation.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.craftly.app.R
import com.craftly.app.data.model.Order

class OrdersFragment : Fragment() {

    private lateinit var ordersRecyclerView: RecyclerView
    private lateinit var emptyOrdersView: LinearLayout
    private val userOrders = mutableListOf<Order>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_orders, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        ordersRecyclerView = view.findViewById(R.id.ordersRecyclerView)
        emptyOrdersView = view.findViewById(R.id.emptyOrdersView)

        setupRecyclerView()
        displayOrders()

        // TODO: Load user orders from API using OrderRepository
    }

    private fun setupRecyclerView() {
        ordersRecyclerView.layoutManager = LinearLayoutManager(requireContext())
        // TODO: Create OrderAdapter and load orders from backend
    }

    private fun displayOrders() {
        if (userOrders.isEmpty()) {
            emptyOrdersView.visibility = View.VISIBLE
            ordersRecyclerView.visibility = View.GONE
        } else {
            emptyOrdersView.visibility = View.GONE
            ordersRecyclerView.visibility = View.VISIBLE
        }
    }
}
